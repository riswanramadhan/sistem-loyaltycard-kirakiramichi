export const ADMIN_FEEDBACK_EVENT = "kira-kira-admin-feedback";

export type AdminFeedbackDetail = {
  kind: "approved" | "rejected" | "request";
  message: string;
  quantity?: number;
};
