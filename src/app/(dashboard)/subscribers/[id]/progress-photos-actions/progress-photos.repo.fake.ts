// Fake in-memory repository for progress photos (unit testing)
// Follows TESTING.md: use Map for state, simple rules, no real DB

export type ProgressPhoto = {
  id: string;
  userProfileId: string;
  imageUrl: string;
  weekNumber: number;
  uploadedAt: Date;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewProgressPhoto = Omit<ProgressPhoto, "id">;

export function makeProgressPhotosRepoFake() {
  const _store = new Map<string, ProgressPhoto>();

  return {
    _store, // Exposed for test setup/assertions

    async findByUserId(userId: string): Promise<ProgressPhoto[]> {
      const photos = Array.from(_store.values()).filter(
        (p) => p.userProfileId === userId
      );
      // Sort by uploadedAt descending (newest first)
      return photos.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    },

    async findByUserIdAndWeek(
      userId: string,
      weekNumber: number
    ): Promise<ProgressPhoto[]> {
      const photos = Array.from(_store.values()).filter(
        (p) => p.userProfileId === userId && p.weekNumber === weekNumber
      );
      // Sort by uploadedAt descending (newest first)
      return photos.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    },

    async findById(id: string): Promise<ProgressPhoto | null> {
      return _store.get(id) ?? null;
    },

    async create(photo: NewProgressPhoto): Promise<ProgressPhoto> {
      // Generate simple ID for testing (no crypto.randomUUID)
      const id = `photo_${_store.size + 1}`;
      const newPhoto: ProgressPhoto = { id, ...photo };
      _store.set(id, newPhoto);
      return newPhoto;
    },

    async update(
      id: string,
      updates: Partial<ProgressPhoto>
    ): Promise<ProgressPhoto | null> {
      const existing = _store.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...updates };
      _store.set(id, updated);
      return updated;
    },

    async deleteById(id: string): Promise<ProgressPhoto | null> {
      const photo = _store.get(id);
      if (!photo) return null;

      _store.delete(id);
      return photo;
    },
  };
}
