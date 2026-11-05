import { Link } from "react-router-dom";
import { STORE_NAME } from "../../lib/config";
import BrandLogo from "./auth/BrandLogo";

/** MedLife logo (same mark as the sign-in and admin screens), linking home. */
export default function Logo() {
  return (
    <Link to="/" className="ml-logo" aria-label={`${STORE_NAME} home`}>
      <BrandLogo />
    </Link>
  );
}
