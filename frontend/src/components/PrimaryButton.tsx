type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };
export default function PrimaryButton({ loading, children, ...rest }: Props) {
  return (
    <button className="btn-primary" disabled={loading || rest.disabled} {...rest}>
      {loading ? "Please wait…" : children}
    </button>
  );
}