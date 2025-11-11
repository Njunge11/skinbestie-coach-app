import type { ProfileTag as ProfileTagRow } from "@/lib/db/schema";

export type ProfileTag = ProfileTagRow;

export type ProfileTagsRepo = {
  findByUserProfileId: (userProfileId: string) => Promise<ProfileTag[]>;
  create: (data: { userProfileId: string; tag: string }) => Promise<ProfileTag>;
  delete: (tagId: string) => Promise<boolean>;
  _store: Map<string, ProfileTag>; // Exposed for test setup
};

export function makeProfileTagsRepoFake(): ProfileTagsRepo {
  const store = new Map<string, ProfileTag>();
  let idCounter = 1;

  return {
    async findByUserProfileId(userProfileId: string): Promise<ProfileTag[]> {
      const tags = Array.from(store.values()).filter(
        (tag) => tag.userProfileId === userProfileId,
      );
      // Sort by createdAt DESC (newest first)
      return tags.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async create(data: {
      userProfileId: string;
      tag: string;
    }): Promise<ProfileTag> {
      const now = new Date();
      const tag: ProfileTag = {
        id: `tag_${idCounter++}`,
        userProfileId: data.userProfileId,
        tag: data.tag,
        createdAt: now,
      };

      store.set(tag.id, tag);
      return tag;
    },

    async delete(tagId: string): Promise<boolean> {
      return store.delete(tagId);
    },

    _store: store,
  };
}
