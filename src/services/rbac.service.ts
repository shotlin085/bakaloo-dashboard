import api from "@/lib/api"
import type {
  Role,
  TeamMember,
  CreateRolePayload,
  UpdateRolePayload,
  InviteMemberPayload,
  UpdateMemberPayload,
} from "@/types/rbac.types"

/* ── Roles ── */

export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get("/admin/roles")
  return data.data ?? data.roles ?? data
}

export async function getRole(roleId: string): Promise<Role> {
  const { data } = await api.get(`/admin/roles/${roleId}`)
  return data.data ?? data
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const { data } = await api.post("/admin/roles", payload)
  return data.data ?? data
}

export async function updateRole(
  roleId: string,
  payload: UpdateRolePayload
): Promise<Role> {
  const { data } = await api.patch(`/admin/roles/${roleId}`, payload)
  return data.data ?? data
}

export async function deleteRole(roleId: string): Promise<void> {
  await api.delete(`/admin/roles/${roleId}`)
}

/* ── Team Members ── */

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data } = await api.get("/admin/team")
  return data.data ?? data.members ?? data
}

export async function inviteMember(
  payload: InviteMemberPayload
): Promise<TeamMember> {
  const { data } = await api.post("/admin/team/invite", payload)
  return data.data ?? data
}

export async function updateMember(
  memberId: string,
  payload: UpdateMemberPayload
): Promise<TeamMember> {
  const { data } = await api.patch(`/admin/team/${memberId}`, payload)
  return data.data ?? data
}

export async function removeMember(memberId: string): Promise<void> {
  await api.delete(`/admin/team/${memberId}`)
}
