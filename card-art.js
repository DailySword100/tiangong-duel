// One local atlas, cropped by SVG viewports without distorting the artwork.
export const CARD_ATLAS={width:1448,height:1086,columns:4,rows:3,url:'./assets/card-items.png?v=20261125-5'};
export const CARD_ART_KEYS=['bamboo','tendon','mulberry','iron','nitrate','sulphur','ash','glue','drill','powder','scrap'];
export function cardIllustration(key){
 const index=CARD_ART_KEYS.indexOf(key);if(index<0)return '';
 const w=CARD_ATLAS.width/CARD_ATLAS.columns,h=CARD_ATLAS.height/CARD_ATLAS.rows;
 const x=index%CARD_ATLAS.columns*w,y=Math.floor(index/CARD_ATLAS.columns)*h;
 return `<svg class="card-item-art" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><image href="${CARD_ATLAS.url}" width="${CARD_ATLAS.width}" height="${CARD_ATLAS.height}"/></svg>`;
}
