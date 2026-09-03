import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  importProfiles as apiImportProfiles,
} from './api.js';

export const PROFILES_QUERY_KEY = 'profiles';

export function useProfiles(familyId, options = {}) {
  return useQuery({
    queryKey: [PROFILES_QUERY_KEY, familyId],
    queryFn: () => fetchProfiles(familyId),
    enabled: !!options.enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProfileMutations(familyId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PROFILES_QUERY_KEY, familyId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createProfile(payload),
    onSuccess: (newProfile) => {
      if (newProfile?.id) {
        queryClient.setQueryData([PROFILES_QUERY_KEY, familyId], (old = []) => [
          ...old,
          newProfile,
        ]);
      }
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProfile(id, payload),
    onSuccess: (updatedProfile) => {
      if (updatedProfile?.id) {
        queryClient.setQueryData([PROFILES_QUERY_KEY, familyId], (old = []) =>
          old.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
        );
      }
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (childId) => deleteProfile(childId),
    onSuccess: (_, childId) => {
      queryClient.setQueryData([PROFILES_QUERY_KEY, familyId], (old = []) =>
        old.filter((p) => p.id !== childId)
      );
      invalidate();
    },
  });

  const importMutation = useMutation({
    mutationFn: (profiles) => apiImportProfiles(profiles, familyId),
    onSuccess: () => {
      invalidate();
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    importMutation,
    invalidateProfiles: invalidate,
  };
}
