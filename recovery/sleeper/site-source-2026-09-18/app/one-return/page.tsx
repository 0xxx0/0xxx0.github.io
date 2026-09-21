import { fieldMetadata } from "../field-catalog";
import OneReturnClient from "./one-return-client";

export const metadata = fieldMetadata("return");

export default function OneReturnPage() {
  return <OneReturnClient />;
}
