export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>HotBowl Surveys</h1>
      <p>Administre surveys e incorpore no seu site com um script.</p>
      <p>Acesse <a href="/admin/surveys">/admin/surveys</a> para criar uma survey.</p>
      <p>Script de incorporação: <code>{`<script src="${process.env.APP_URL || "http://localhost:3000"}/api/embed?siteId=SEU_SITE&surveyId=SUA_SURVEY" async></script>`}</code></p>
    </div>
  );
}
