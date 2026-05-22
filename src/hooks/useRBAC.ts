import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getTeamMembers,
  inviteMember,
  updateMember,
  removeMember,
} from "@/services/rbac.service"
import type {
  CreateRolePayload,
  UpdateRolePayload,
  InviteMemberPayload,
  UpdateMemberPayload,
} from "@/types/rbac.types"

/* ── Roles ── */

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      toast.success("Role created")
    },
    onError: () => toast.error("Failed to create role"),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: UpdateRolePayload }) =>
      updateRole(roleId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      toast.success("Role updated")
    },
    onError: () => toast.error("Failed to update role"),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      toast.success("Role deleted")
    },
    onError: () => toast.error("Failed to delete role"),
  })
}

/* ── Team Members ── */

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
    staleTime: 2 * 60 * 1000,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteMemberPayload) => inviteMember(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Team member invited")
    },
    onError: () => toast.error("Failed to invite member"),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, payload }: { memberId: string; payload: UpdateMemberPayload }) =>
      updateMember(memberId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Member updated")
    },
    onError: () => toast.error("Failed to update member"),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Member removed")
    },
    onError: () => toast.error("Failed to remove member"),
  })
}
