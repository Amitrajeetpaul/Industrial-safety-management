import { db } from "./db";
import {
  users, incidents, risks,
  type User, type InsertUser,
  type Incident, type InsertIncident,
  type Risk, type InsertRisk
} from "@shared/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Incidents
  getIncidents(): Promise<Incident[]>;
  getIncident(id: number): Promise<Incident | undefined>;
  createIncident(incident: InsertIncident & { reportedBy: number }): Promise<Incident>;
  updateIncidentStatus(id: number, status: "open" | "under_review" | "resolved"): Promise<Incident | undefined>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Risks
  getRisks(): Promise<Risk[]>;
  createRisk(risk: InsertRisk): Promise<Risk>;
  
  // Stats
  getStats(): Promise<{
    totalIncidents: number;
    activeCases: number;
    riskScore: number;
    resolvedCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getIncidents(): Promise<Incident[]> {
    return await db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  async getIncident(id: number): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident;
  }

  async createIncident(incident: InsertIncident & { reportedBy: number }): Promise<Incident> {
    const [newIncident] = await db.insert(incidents).values(incident).returning();
    return newIncident;
  }

  async updateIncidentStatus(id: number, status: "open" | "under_review" | "resolved"): Promise<Incident | undefined> {
    const [updated] = await db.update(incidents)
      .set({ status })
      .where(eq(incidents.id, id))
      .returning();
    return updated;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async getRisks(): Promise<Risk[]> {
    return await db.select().from(risks).orderBy(desc(risks.createdAt));
  }

  async createRisk(risk: InsertRisk): Promise<Risk> {
    const [newRisk] = await db.insert(risks).values(risk).returning();
    return newRisk;
  }

  async getStats() {
    // This is a simplified stats query. Real world would be more complex.
    const allIncidents = await db.select().from(incidents);
    const totalIncidents = allIncidents.length;
    const activeCases = allIncidents.filter(i => i.status !== 'resolved').length;
    const resolvedCount = allIncidents.filter(i => i.status === 'resolved').length;
    
    // Calculate a dummy "Risk Score" based on severity of active incidents
    const riskScore = Math.min(100, activeCases * 10 + allIncidents.filter(i => i.severity === 'critical').length * 20);

    return {
      totalIncidents,
      activeCases,
      riskScore,
      resolvedCount
    };
  }
}

export const storage = new DatabaseStorage();
