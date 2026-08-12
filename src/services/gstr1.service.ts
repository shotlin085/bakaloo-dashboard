import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  Gstr1Period,
  Gstr1PeriodParams,
  Gstr1B2CSResponse,
  HsnSummaryRow,
} from "@/types/gstr1.types"

export async function getGstr1Period(params: Gstr1PeriodParams): Promise<Gstr1Period> {
  const { data } = await api.get<ApiResponse<Gstr1Period>>("/admin/gstr1/period", { params })
  return data.data
}

export async function getB2CS(params: Gstr1PeriodParams): Promise<Gstr1B2CSResponse> {
  const { data } = await api.get<ApiResponse<Gstr1B2CSResponse>>("/admin/gstr1/b2cs", { params })
  return data.data
}

export async function getHsnSummary(params: Gstr1PeriodParams): Promise<HsnSummaryRow[]> {
  const { data } = await api.get<ApiResponse<HsnSummaryRow[]>>("/admin/gstr1/hsn-summary", { params })
  return Array.isArray(data.data) ? data.data : []
}

export async function exportGstr1Excel(params: Gstr1PeriodParams): Promise<Blob> {
  const { data } = await api.get("/admin/gstr1/export-excel", {
    params,
    responseType: "blob",
  })
  return data
}
