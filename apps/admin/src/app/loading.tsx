export default function Loading() {
  return <main id="main" className="shell admin-loading" aria-busy="true" aria-label="A carregar a operação">
    <span className="admin-loading-line short" />
    <span className="admin-loading-line title" />
    <span className="admin-loading-line" />
    <div className="admin-loading-grid">
      <span /><span /><span /><span />
    </div>
    <p>Estamos a abrir esta área do IBIZA…</p>
  </main>;
}
