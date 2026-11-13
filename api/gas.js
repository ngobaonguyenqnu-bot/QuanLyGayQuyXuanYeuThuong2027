// Vercel Serverless Function: proxy an toàn giữa giao diện và Google Apps Script.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  if (!gasUrl) {
    return res.status(500).json({
      success: false,
      message: "Thiếu biến môi trường GAS_WEB_APP_URL trên Vercel."
    });
  }

  try {
    const upstream = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });

    const raw = await upstream.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("Google Apps Script không trả về JSON. Hãy kiểm tra URL triển khai Web App và quyền truy cập.");
    }

    return res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: error.message || "Không thể kết nối Google Apps Script."
    });
  }
}
