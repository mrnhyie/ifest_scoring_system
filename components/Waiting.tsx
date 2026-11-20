type Props = {
  title?: string;
  body?: string;
  showAdminLink?: boolean;
};

export default function Waiting({
  title = "Waiting for a session",
  body = "Add the competitors and start scoring in the admin view.",
  showAdminLink = true,
}: Props) {
  return (
    <section className="waiting" id="waitingView">
      <div className="waiting-inner">
        <span className="waiting-pulse" aria-hidden="true" />
        <h2>{title}</h2>
        <p>{body}</p>
        {showAdminLink && (
          <a className="waiting-link" href="/">
            Open admin view
          </a>
        )}
      </div>
    </section>
  );
}
