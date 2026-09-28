import { Link } from "react-router-dom";
import { STORE_NAME } from "../../lib/config";

export default function Logo() {
  return (
    <Link to="/" className="ml-logo" aria-label={`${STORE_NAME} home`}>
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="8" fill="currentColor" />
        <path d="M12.5 7h5v5.5H23v5h-5.5V23h-5v-5.5H7v-5h5.5z" fill="#fff" />
      </svg>
      <span>{STORE_NAME}</span>
    </Link>
  );
}
