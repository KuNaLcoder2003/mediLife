import { useState } from "react";
import FormInput from "./FormInput";

export default function PasswordInput(props: React.ComponentProps<typeof FormInput>) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <FormInput {...props} type={show ? "text" : "password"} />
      <button type="button" className="eye" onClick={() => setShow(!show)}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}