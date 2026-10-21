import { AlertIcon } from "./Icons";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; error?: string; hint?: string; optional?: boolean;
};
export default function FormInput({ label, error, hint, optional, id, ...rest }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} {optional && <span className="optional">(optional)</span>}</label>
      <input id={id} className={error ? "input input--error" : "input"} {...rest} />
      {error ? <p className="field-error"><AlertIcon /> {error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}