import { GoogleGenAI } from '@google/genai';

export interface CitizenAnalysisResult {
  plumeClassification: string;
  opticalOpacityPercent: number;
  estimatedPm25Contribution: number;
  healthAdvisory: string;
  suggestedAction: string;
  targetAuthority: string;
  confidence: number;
  source: 'gemini' | 'rule_heuristic';
}

export async function analyzeCitizenIncident(
  description: string,
  emissionType: string,
  locationName: string,
  imageBase64?: string
): Promise<CitizenAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `
You are the BRICS Federated Clean Air Intelligence Visual & Incident Classifier.
Analyze citizen reports of hyper-local pollution (agricultural stubble burning, industrial factory emissions, waste burning, diesel traffic).
Return a JSON object with:
- plumeClassification: specific chemical/combustion classification
- opticalOpacityPercent: estimated visual opacity (0-100)
- estimatedPm25Contribution: estimated local PM2.5 delta in µg/m³ (10-350)
- healthAdvisory: concise public guidance
- suggestedAction: operational enforcement instruction
- targetAuthority: responsible regional authority (e.g. SPCB/CPCB in India, CETESB in Brazil, MEE in China, DFFE in South Africa)
- confidence: decimal between 0.70 and 0.99
Output purely raw JSON.
`;

      const prompt = `
Location: ${locationName}
Category: ${emissionType}
Citizen Description: "${description}"

Provide hyper-local smoke opacity, particulate emission estimate, and rapid intervention routing.
`;

      let contents: any = prompt;
      if (imageBase64) {
        contents = {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
              }
            },
            { text: prompt }
          ]
        };
      }

      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });

      const text = res.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        return {
          plumeClassification: parsed.plumeClassification || `${emissionType.replace('_', ' ').toUpperCase()} Plume`,
          opticalOpacityPercent: parsed.opticalOpacityPercent || 75,
          estimatedPm25Contribution: parsed.estimatedPm25Contribution || 110,
          healthAdvisory: parsed.healthAdvisory || 'High particulate concentration. Wear an N95 respirator downwind.',
          suggestedAction: parsed.suggestedAction || 'Deploy municipal flying squad for on-site inspection.',
          targetAuthority: parsed.targetAuthority || 'State Pollution Control Board & CAQM Nodal Cell',
          confidence: parsed.confidence || 0.92,
          source: 'gemini'
        };
      }
    } catch (err) {
      console.warn('Gemini incident analysis failed, falling back to heuristic:', err);
    }
  }

  // Heuristic rule-based fallback
  const d = description.toLowerCase();
  let classification = 'Cellulosic Biomass Agricultural Burning';
  let opacity = 75;
  let pm25Delta = 120;
  let authority = 'State Pollution Control Board (SPCB) & District Flying Squad';
  let action = 'Issue immediate spot-fine order and extinguish active crop residue burning.';

  if (emissionType === 'industrial_plume' || d.includes('factory') || d.includes('stack') || d.includes('chemical')) {
    classification = 'High-Sulphur Industrial Smelter / Boiler Plume';
    opacity = 85;
    pm25Delta = 180;
    authority = 'Central Pollution Control Board Industrial Surveillance Wing';
    action = 'Perform continuous emission monitoring system (CEMS) audit and issue stop-work notice.';
  } else if (emissionType === 'waste_incineration' || d.includes('plastic') || d.includes('garbage')) {
    classification = 'Polymer & Municipal Solid Waste Smolder';
    opacity = 90;
    pm25Delta = 160;
    authority = 'Municipal Corporation Solid Waste Enforcement Wing';
    action = 'Direct fire tender to extinguish illegal trash smolder; inspect CCTV for violators.';
  } else if (emissionType === 'transboundary_smog') {
    classification = 'Regional Trans-Boundary Aerosol Plume';
    opacity = 65;
    pm25Delta = 95;
    authority = 'Commission for Air Quality Management (CAQM) Interstate Taskforce';
    action = 'Trigger GRAP (Graded Response Action Plan) Stage-III emergency mitigation.';
  }

  return {
    plumeClassification: classification,
    opticalOpacityPercent: opacity,
    estimatedPm25Contribution: pm25Delta,
    healthAdvisory: 'Elevated localized particulate load. Avoid vigorous outdoor breathing in downwind trajectory.',
    suggestedAction: action,
    targetAuthority: authority,
    confidence: 0.89,
    source: 'rule_heuristic'
  };
}
