import { getClient } from "@fluxpipe/database";

export const profileService = {
  async enrichProfile(orgId: string, externalId: string): Promise<Record<string, unknown>> {
    const events = await getClient().event.findMany({
      where: { orgId },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });

    const profile: Record<string, unknown> = {
      externalId,
      eventCount: events.length,
      firstSeen: events.length > 0 ? events[events.length - 1]?.receivedAt : null,
      lastSeen: events.length > 0 ? events[0]?.receivedAt : null,
    };

    return profile;
  },
};
