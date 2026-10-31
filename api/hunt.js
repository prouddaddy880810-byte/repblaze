// RepBlaze prospect discovery — server only. No automated outreach.
const CATEGORIES = ["plumber","HVAC contractor","roofing contractor","auto repair shop","landscaping company"];
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).json({error:"POST required"});
  const secret=process.env.HUNTER_SECRET;
  if(!secret || req.headers.authorization!==`Bearer ${secret}`) return res.status(401).json({error:"Unauthorized"});
  const googleKey=process.env.GOOGLE_PLACES_API_KEY;
  const url=process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!googleKey||!url||!serviceKey) return res.status(503).json({error:"Server configuration incomplete"});
  const city="St. Joseph, Missouri";
  const results=[];
  for(const category of CATEGORIES) {
    const response=await fetch("https://places.googleapis.com/v1/places:searchText",{
      method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":googleKey,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount"},
      body:JSON.stringify({textQuery:`${category} in ${city}`,maxResultCount:10})
    });
    if(!response.ok) {results.push({category,error:"Places search failed"});continue;}
    const data=await response.json();
    for(const place of data.places||[]) {
      const count=place.userRatingCount??0;
      const hasSite=!!place.websiteUri;
      const score=Math.min(100,(hasSite?0:45)+(count<10?30:count<40?20:count<100?10:0)+(place.rating&&place.rating<4.2?15:0));
      const prospect={place_id:place.id,business_name:place.displayName?.text||"Unknown",category,city,address:place.formattedAddress||null,website:place.websiteUri||null,phone:place.nationalPhoneNumber||null,rating:place.rating??null,review_count:count,opportunity_score:score,recommended_offer:hasSite?"REVIEW_AUTOMATION":"WEBSITE_BUILD",sales_angle:hasSite?"Review volume may be a growth opportunity; verify with a full audit.":"No website listed on Google; verify whether a website build would help.",last_checked_at:new Date().toISOString()};
      const saved=await fetch(`${url}/rest/v1/prospects?on_conflict=place_id`,{method:"POST",headers:{"apikey":serviceKey,"Authorization":`Bearer ${serviceKey}`,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(prospect)});
      if(!saved.ok) {results.push({category,error:"Prospect storage failed"});continue;}
      results.push({business:prospect.business_name,score,offer:prospect.recommended_offer});
    }
  }
  return res.status(200).json({searched:CATEGORIES.length,stored:results.filter(x=>x.business).length,results});
}
