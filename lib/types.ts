import { Decimal } from "@prisma/client/runtime/library";

export type PitchStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "DROPPED";

// Helper to convert Decimal to number
export function toNumber(val: Decimal | number | string): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val);
  return val.toNumber();
}

// Computed types for UI
export interface EngineerWithCapacity {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  availableWeeks: number;
  assignedWeeks: number;
  remainingWeeks: number;
  capacityId: string;
}

export interface PitchWithAssignments {
  id: string;
  title: string;
  pitchDocUrl: string | null;
  estimateWeeks: number;
  status: PitchStatus;
  priority: number | null;
  notes: string | null;
  podId: string | null;
  assignedWeeks: number;
  remainingWeeks: number;
  assignments: {
    id: string;
    engineerId: string;
    engineerName: string;
    weeksAllocated: number;
  }[];
}

export interface Pod {
  id: string;
  name: string;
  leaderId: string | null;
  leaderName: string | null;
}

export interface CycleDetail {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  description: string | null;
  totalAvailableWeeks: number;
  totalRequiredWeeks: number;
  surplusOrDeficit: number;
  engineers: EngineerWithCapacity[];
  pitches: PitchWithAssignments[];
  pods: Pod[];
}

export interface CycleSummary {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  description: string | null;
  pitchCount: number;
  totalAvailableWeeks: number;
  totalRequiredWeeks: number;
  surplusOrDeficit: number;
}

// API request/response types
export interface CreateCycleRequest {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface CreateEngineerRequest {
  name: string;
  email?: string;
}

export interface SetCapacityRequest {
  cycleId: string;
  availableWeeks: number;
}

export interface CreatePitchRequest {
  cycleId: string;
  title: string;
  pitchDocUrl?: string;
  estimateWeeks: number;
  priority?: number;
  notes?: string;
}

export interface UpdatePitchRequest {
  title?: string;
  pitchDocUrl?: string;
  estimateWeeks?: number;
  status?: PitchStatus;
  priority?: number;
  notes?: string;
  podId?: string | null;
  cycleId?: string | null;
}

export interface CreateAssignmentRequest {
  cycleId: string;
  engineerId: string;
  pitchId: string;
  weeksAllocated: number;
}

export interface UpdateAssignmentRequest {
  weeksAllocated: number;
}

