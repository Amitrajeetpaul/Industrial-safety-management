import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Auth
  setupAuth(app);

  // --- Incidents ---
  app.get(api.incidents.list.path, async (req, res) => {
    // Optional: filter by user role (workers might only see their own?)
    // For now, allow all authenticated users to see all (transparency)
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.post(api.incidents.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.incidents.create.input.parse(req.body);
      const incident = await storage.createIncident({
        ...input,
        reportedBy: req.user.id
      });
      res.status(201).json(incident);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.incidents.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const incident = await storage.getIncident(Number(req.params.id));
    if (!incident) return res.status(404).json({ message: "Incident not found" });
    res.json(incident);
  });

  app.patch(api.incidents.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Only admins/managers can update status
    if (req.user.role === 'worker') return res.sendStatus(403);
    
    try {
      const { status } = api.incidents.update.input.parse(req.body);
      const updated = await storage.updateIncidentStatus(Number(req.params.id), status);
      if (!updated) return res.status(404).json({ message: "Incident not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // --- Risks ---
  app.get(api.risks.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const risks = await storage.getRisks();
    res.json(risks);
  });

  app.post(api.risks.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Workers might not be allowed to define formal risks, but for now let's allow it or restrict to manager+
    // if (req.user.role === 'worker') return res.sendStatus(403);
    
    try {
      const input = api.risks.create.input.parse(req.body);
      const risk = await storage.createRisk(input);
      res.status(201).json(risk);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // --- Stats ---
  app.get(api.stats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const stats = await storage.getStats();
    res.json(stats);
  });

  // --- Seed Data ---
  await seedData();

  return httpServer;
}

async function seedData() {
  const hashedPassword = await hashPassword("password123");

  const users = await storage.getUserByUsername("admin");
  if (!users) {
    // Create default users
    const adminUser = await storage.createUser({
      username: "admin",
      password: hashedPassword,
      role: "admin",
      name: "System Admin"
    });

    await storage.createUser({
      username: "manager",
      password: hashedPassword,
      role: "manager",
      name: "Safety Manager"
    });

    await storage.createUser({
      username: "worker",
      password: hashedPassword,
      role: "worker",
      name: "John Doe"
    });

    // Seed Incidents
    await storage.createIncident({
      title: "Chemical Spill in Zone B",
      description: "Small leakage of cleaning solvent observed near storage unit 4.",
      location: "Warehouse Zone B",
      severity: "medium",
      imageUrl: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&auto=format&fit=crop",
      reportedBy: adminUser.id
    });

    await storage.createIncident({
      title: "Broken Safety Rail",
      description: "Guard rail on 2nd floor walkway is loose.",
      location: "Production Line 2",
      severity: "high",
      imageUrl: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&auto=format&fit=crop",
      reportedBy: adminUser.id
    });

    // Seed Risks
    await storage.createRisk({
      hazard: "Forklift Traffic",
      description: "High traffic intersection near loading dock.",
      riskLevel: "high",
      mitigation: "Install mirrors and warning lights."
    });
  } else {
    // Update existing users with hashed password if needed (lite mode hack)
    if (!users.password.includes('.')) {
       await storage.updateUser(users.id, { password: hashedPassword });
       
       const manager = await storage.getUserByUsername("manager");
       if (manager && !manager.password.includes('.')) {
         await storage.updateUser(manager.id, { password: hashedPassword });
       }
       
       const worker = await storage.getUserByUsername("worker");
       if (worker && !worker.password.includes('.')) {
         await storage.updateUser(worker.id, { password: hashedPassword });
       }
    }
  }
}
