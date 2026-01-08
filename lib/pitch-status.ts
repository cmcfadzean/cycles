import { prisma } from "./prisma";
import { toNumber } from "./types";

/**
 * Updates the pitch status based on staffing:
 * - If fully staffed (assigned weeks >= estimate weeks) and currently PLANNING → READY_FOR_DEV
 * - If not fully staffed and currently READY_FOR_DEV → PLANNING
 * 
 * This preserves manual overrides to other statuses (BACKLOG, COMPLETE, CANCELED)
 */
export async function updatePitchStatusBasedOnStaffing(pitchId: string): Promise<void> {
  // Get the pitch with its assignments
  const pitch = await prisma.pitch.findUnique({
    where: { id: pitchId },
    include: {
      assignments: true,
    },
  });

  if (!pitch) return;

  const estimateWeeks = toNumber(pitch.estimateWeeks);
  const assignedWeeks = pitch.assignments.reduce(
    (sum, a) => sum + toNumber(a.weeksAllocated),
    0
  );
  
  const isFullyStaffed = assignedWeeks >= estimateWeeks && estimateWeeks > 0;

  // Only auto-update between PLANNING and READY_FOR_DEV
  // This preserves manual overrides to other statuses
  if (isFullyStaffed && pitch.status === "PLANNING") {
    await prisma.pitch.update({
      where: { id: pitchId },
      data: { status: "READY_FOR_DEV" },
    });
  } else if (!isFullyStaffed && pitch.status === "READY_FOR_DEV") {
    await prisma.pitch.update({
      where: { id: pitchId },
      data: { status: "PLANNING" },
    });
  }
}

