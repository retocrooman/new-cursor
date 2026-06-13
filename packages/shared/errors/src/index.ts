export type {
  CustomErrorData,
  CustomErrorParams,
  ErrorCode,
} from "./custom-error";
export { CustomError } from "./custom-error";
export { type DomainErrorClass, defineDomainError } from "./domain-error";
export {
  defineReferenceGuardError,
  type ReferenceGuardErrorData,
  type ReferenceGuardErrorFactory,
} from "./reference-guard-error";
