import { ApiError } from "@/lib/api/client";

export const ROLE_NOT_ASSIGNED_CODE = "ROLE_NOT_ASSIGNED";

export const ROLE_NOT_ASSIGNED_MESSAGE =
  "Aapko role assign nahi kiya gaya hai. Please admin se contact kare.";

export class RoleNotAssignedError extends Error {
  constructor(message = ROLE_NOT_ASSIGNED_MESSAGE) {
    super(message);
    this.name = "RoleNotAssignedError";
  }
}

export function isRoleNotAssignedError(error: unknown): boolean {
  if (error instanceof RoleNotAssignedError) return true;
  if (error instanceof ApiError) {
    return (
      error.code === ROLE_NOT_ASSIGNED_CODE ||
      error.message === ROLE_NOT_ASSIGNED_MESSAGE
    );
  }
  return false;
}
