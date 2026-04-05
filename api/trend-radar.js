const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export default async function handler(req, res) {
  try {
    // 1. Fetch GitHub Trending (via Search API per i repo più stellati dell'ultima settimana)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateFormatted = sevenDaysAgo.toISOString().split('T')[0];

    // Query per repo AI e Linux creati di recente o con molti progressi
    const ghQuery = `created:>${dateFormatted} topic:ai OR topic:linux OR topic:open-source`;
    const ghUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(ghQuery)}&sort=stars&order=desc&per_page=10`;

    const ghRes = await fetch(ghUrl, {
      headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    });
    const ghData = await ghRes.json();
    const githubTrends = (ghData.items || []).map(repo => ({
      type: 'github',
      title: repo.name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      author: repo.owner.login,
      tags: repo.topics
    }));

    // 2. Fetch Hugging Face Trending Models
    const hfUrl = 'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=5';
    const hfRes = await fetch(hfUrl);
    const hfData = await hfRes.json();
    const hfTrends = (hfData || []).map(model => ({
      type: 'huggingface',
      title: model.modelId,
      description: `Model for ${model.pipeline_tag || 'N/A'}. Downloads: ${model.downloads}`,
      url: `https://huggingface.co/${model.modelId}`,
      downloads: model.downloads,
      tags: [model.pipeline_tag].filter(Boolean)
    }));

    res.status(200).json({
      success: true,
      trends: [...githubTrends, ...hfTrends],
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Trend Radar Error:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
}
