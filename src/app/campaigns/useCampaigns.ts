import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCampaign,
  getCampaign,
  listCampaignOverview,
  updateCampaign,
  type CampaignInput,
} from '@/services/campaigns';

export function useCampaigns() {
  return useQuery({ queryKey: ['campaigns'], queryFn: listCampaignOverview });
}

export function useCampaign(id: string) {
  return useQuery({ queryKey: ['campaign', id], queryFn: () => getCampaign(id), enabled: Boolean(id) });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput) => createCampaign(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput) => updateCampaign(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
}
