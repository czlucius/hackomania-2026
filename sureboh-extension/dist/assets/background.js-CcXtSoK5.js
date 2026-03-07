const c="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",l="https://api.openai.com/v1/chat/completions",d=`You are SureBoh.ai, a fact-checking AI assistant specializing in Singapore misinformation. Analyze the provided text and return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "trust_score": <integer 0-100>,
  "verdict": {
    "en": "<one of: Verified | Unverified | Misleading | Scam>",
    "zh": "<Chinese translation of verdict>",
    "ms": "<Malay translation of verdict>"
  },
  "summary": {
    "en": [
      { "type": "<fake|real|info>", "text": "<concise point>" }
    ],
    "zh": [
      { "type": "<fake|real|info>", "text": "<Chinese translation>" }
    ],
    "ms": [
      { "type": "<fake|real|info>", "text": "<Malay translation>" }
    ]
  },
  "sources": [
    { "name": "<source name>", "icon": "<emoji>", "url": "<official URL if known, else omit>" }
  ]
}

Rules:
- Use type "fake" for the misinformation being claimed, "real" for the correct fact, "info" for neutral observations.
- Provide 1-3 concise bullet points per language.
- trust_score: 0-30 = Scam/Misleading, 31-69 = Unverified, 70-100 = Verified.
- If text is too short or not a claim, return trust_score: 50, verdict Unverified, with an info bullet.
- Always include gov.sg sources if relevant.
- Return ONLY valid JSON, no explanation, no markdown code fences.`;async function m(t){const r={model:"gpt-4o-mini",temperature:.2,max_tokens:1024,messages:[{role:"system",content:d},{role:"user",content:`Text to analyze:
"${t}"`}],response_format:{type:"json_object"}},e=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify(r)});if(!e.ok){const a=await e.json().catch(()=>({}));throw new Error(`OpenAI API error: ${e.status} - ${a?.error?.message||e.statusText}`)}const o=(await e.json())?.choices?.[0]?.message?.content;if(!o)throw new Error("No response from OpenAI");return JSON.parse(o)}const f={trust_score:50,verdict:{en:"Unverified",zh:"未验证",ms:"Tidak Disahkan"},summary:{en:[{type:"info",text:"Analysis could not be completed. Please try again."}],zh:[{type:"info",text:"无法完成分析，请再试一次。"}],ms:[{type:"info",text:"Analisis tidak dapat diselesaikan. Sila cuba lagi."}]},sources:[]};chrome.runtime.onMessage.addListener((t,r,e)=>{if(t.type==="ANALYZE_MESSAGE")return m(t.text).then(n=>e(n)).catch(n=>{console.error("OpenAI analysis failed:",n),e(f)}),!0;if(t.type==="SUBMIT_VOTE"){const{vote:n,assessment:o}=t,a=o?.verdict?.en||"Unknown Claim",i=r?.tab?.url?.includes("whatsapp")?"WhatsApp":r?.tab?.url?.includes("hardwarezone")?"HardwareZone":r?.tab?.url?.includes("telegram")?"Telegram":"Unknown";return fetch("http://localhost:8000/api/telemetry/vote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({claim_text:a,verdict:o?.verdict?.en,trust_score:o?.trust_score,vote:n,platform:i})}).then(s=>s.json()).then(s=>console.log("Vote submitted:",s)).catch(s=>console.error("Failed to submit vote:",s)),!0}else if(t.type==="ANALYZE_IMAGE"){const{src:n,alt:o}=t;let a=null;const i=(n+" "+o).toLowerCase();return i.includes("ai-generated")||i.includes("midjourney")||i.includes("deepfake")?a={warning:"Potential AI-generated or manipulated image detected. Verify the source."}:(i.includes("scam")||i.includes("phishing"))&&(a={warning:"This image contains patterns associated with known phishing campaigns."}),setTimeout(()=>e(a),800),!0}});
