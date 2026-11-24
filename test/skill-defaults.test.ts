import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_CANVAS_AGENT_SKILL_ID, ensureDefaultCanvasAgentSkill } from "@/services/skill-defaults";

function skill(skillId: string, isAdded = true) {
    return { skillId, skillName: skillId, isAdded } as never;
}

const RESOLVED_SKILL_ID = "builtin-short-drama-workflow";

describe("ensureDefaultCanvasAgentSkill", () => {
    test("keeps an already added default skill without writing", async () => {
        let added = 0;
        const requested: string[] = [];
        const result = await ensureDefaultCanvasAgentSkill({
            listAdded: async () => ({ skills: [skill(RESOLVED_SKILL_ID)] }),
            get: async (id: string) => {
                requested.push(id);
                return { skill: skill(RESOLVED_SKILL_ID) };
            },
            add: async () => {
                added += 1;
                return { skill: skill(RESOLVED_SKILL_ID) };
            },
        });
        expect(requested).toEqual([DEFAULT_CANVAS_AGENT_SKILL_ID]);
        expect(result.skills[0].skillId).toBe(RESOLVED_SKILL_ID);
        expect(added).toBe(0);
    });

    test("installs the resolved default skill once when it is not added", async () => {
        let listCalls = 0;
        const added: string[] = [];
        const result = await ensureDefaultCanvasAgentSkill({
            listAdded: async () => ({ skills: listCalls++ === 0 ? [] : [skill(RESOLVED_SKILL_ID)] }),
            get: async () => ({ skill: skill(RESOLVED_SKILL_ID, false) }),
            add: async (id: string) => {
                added.push(id);
                return { skill: skill(RESOLVED_SKILL_ID) };
            },
        });
        expect(result.skills[0].skillId).toBe(RESOLVED_SKILL_ID);
        expect(added).toEqual([RESOLVED_SKILL_ID]);
        expect(listCalls).toBe(2);
    });
});

import { useUserStore } from "@/stores/use-user-store";
const skillUser = { id: "skill-user", username: "member", displayName: "Member", role: "user" as const, status: "active" as const };
beforeEach(() => useUserStore.setState({ user: skillUser, hydrated: true }));
afterEach(() => useUserStore.setState({ user: null, hydrated: false }));
