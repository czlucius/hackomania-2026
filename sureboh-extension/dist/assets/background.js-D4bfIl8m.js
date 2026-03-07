const c="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",l="https://api.openai.com/v1/chat/completions",m=`You are SureBoh.ai, a fact-checking AI assistant specializing in Singapore misinformation. Analyze the provided text and return a JSON object (no markdown, just raw JSON) with this exact structure:
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

Rules & Persona:
- You are decisive. If a claim matches a known news report, official government statement (e.g. SPF, MOH, MOT, Singapore Customs), or widely documented fact, mark it as **Verified** (Trust Score 80-100).
- If a claim is clearly false or matches a known scam/misinformation pattern, mark it as **Misleading** or **Scam** (Trust Score 0-30).
- Only use **Unverified** (Trust Score 40-70) if the claim is truly ambiguous, needs more info, or is a personal opinion/anecdote that cannot be fact-checked.
- For news reports (like cigarette seizures at Changi, police arrests, etc.), if the details (location, numbers, dates) match official reports, **VEIRFY IT**.
- Use type "fake" for the misinformation being claimed (if any), "real" for the correct fact, "info" for neutral observations.
- Always include gov.sg sources or official news links (AsiaOne, Straits Times, Mothership) if they are mentioned or relevant.
- Return ONLY valid JSON.`;async function f(t){const r={model:"gpt-4o-mini",temperature:.2,max_tokens:1024,messages:[{role:"system",content:m},{role:"user",content:`Text to analyze:
"${t}"`}],response_format:{type:"json_object"}},e=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify(r)});if(!e.ok){const o=await e.json().catch(()=>({}));throw new Error(`OpenAI API error: ${e.status} - ${o?.error?.message||e.statusText}`)}const n=(await e.json())?.choices?.[0]?.message?.content;if(!n)throw new Error("No response from OpenAI");return JSON.parse(n)}const d={trust_score:50,verdict:{en:"Unverified",zh:"未验证",ms:"Tidak Disahkan"},summary:{en:[{type:"info",text:"Analysis could not be completed. Please try again."}],zh:[{type:"info",text:"无法完成分析，请再试一次。"}],ms:[{type:"info",text:"Analisis tidak dapat diselesaikan. Sila cuba lagi."}]},sources:[]};chrome.runtime.onMessage.addListener((t,r,e)=>{if(t.type==="ANALYZE_MESSAGE")return f(t.text).then(a=>e(a)).catch(a=>{console.error("OpenAI analysis failed:",a),e(d)}),!0;if(t.type==="SUBMIT_VOTE"){const{vote:a,assessment:n}=t,o=n?.verdict?.en||"Unknown Claim",i=r?.tab?.url?.includes("whatsapp")?"WhatsApp":r?.tab?.url?.includes("hardwarezone")?"HardwareZone":r?.tab?.url?.includes("telegram")?"Telegram":"Unknown";return fetch("http://localhost:8000/api/telemetry/vote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({claim_text:o,verdict:n?.verdict?.en,trust_score:n?.trust_score,vote:a,platform:i})}).then(s=>s.json()).then(s=>console.log("Vote submitted:",s)).catch(s=>console.error("Failed to submit vote:",s)),!0}else if(t.type==="ANALYZE_IMAGE"){const{src:a,alt:n}=t;let o=null;const i=(a+" "+n).toLowerCase();return i.includes("ai-generated")||i.includes("midjourney")||i.includes("deepfake")?o={warning:"Potential AI-generated or manipulated image detected. Verify the source."}:(i.includes("scam")||i.includes("phishing"))&&(o={warning:"This image contains patterns associated with known phishing campaigns."}),setTimeout(()=>e(o),800),!0}});
