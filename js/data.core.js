/* ============================================================
   世界大战 · 全球战争档案
   Core editorial data — timeline, situation board, sources
   ============================================================ */
window.WW2 = {
  meta: {
    title: "世界大战",
    subtitle: "全球战争档案",
    en: "THE WORLD AT WAR",
    period: "1931 — 1945",
    intro:
      "从沈阳北郊的炮声，到密苏里号甲板上的签字；从斯大林格勒的废墟，到广岛的蘑菇云。第二次世界大战不是一条单线故事，而是帝国、民族、意识形态、工业与普通人命运相互撕扯的全球现场。",
    stats: [
      { value: "70+", label: "参战国与地区", note: "含殖民地与自治领" },
      { value: "1.1亿", label: "被动员军人", note: "约数，含各国武装力量" },
      { value: "7000–8500万", label: "死亡人数", note: "军民合计，学界估计区间" },
      { value: "14年", label: "从九一八算起", note: "欧洲全面战争为1939—1945" }
    ]
  },

  timeline: [
    {
      date: "1931.09.18", year: 1931, title: "九一八事变", en: "Mukden Incident",
      text: "日本关东军制造柳条湖事件，随即侵占中国东北。中国局部抗战由此开始，也被许多史家视为第二次世界大战的序幕。",
      tag: "序幕", link: null
    },
    {
      date: "1933.01.30", year: 1933, title: "希特勒出任德国总理", en: "Hitler Comes to Power",
      text: "魏玛共和国在失业、屈辱与政治极化中崩塌。纳粹党以合法程序进入权力中心，随后迅速拆解民主制度。",
      tag: "欧洲", link: null
    },
    {
      date: "1935.10.03", year: 1935, title: "意大利入侵埃塞俄比亚", en: "Second Italo-Ethiopian War",
      text: "墨索里尼以飞机、毒气与装甲部队进攻埃塞俄比亚。国际联盟的制裁软弱无力，侵略者第一次尝到“低成本扩张”的甜头。",
      tag: "非洲", link: null
    },
    {
      date: "1936.07.17", year: 1936, title: "西班牙内战爆发", en: "Spanish Civil War",
      text: "佛朗哥发动叛乱，德国与意大利公开支援国民军，苏联援助共和派，国际纵队奔赴西班牙。它成为二战前夜的“预演”。",
      tag: "欧洲", link: { type: "event", id: "spain" }
    },
    {
      date: "1937.07.07", year: 1937, title: "七七事变 · 中国全民族抗战", en: "Marco Polo Bridge Incident",
      text: "卢沟桥枪声后，中日全面战争爆发。8月淞沪会战打响，12月南京沦陷并发生大屠杀。中国战场拖住了日本陆军主力，也付出极其惨重的代价。",
      tag: "亚洲", link: { type: "battle", id: "shanghai" }
    },
    {
      date: "1938.09.30", year: 1938, title: "慕尼黑协定", en: "Munich Agreement",
      text: "英法在未邀请捷克斯洛伐克的情况下，把苏台德区交给德国。张伯伦宣称带来“一代人的和平”，不到一年，战争爆发。",
      tag: "绥靖", link: { type: "event", id: "munich" }
    },
    {
      date: "1938.11.09", year: 1938, title: "水晶之夜", en: "Kristallnacht",
      text: "纳粹煽动全国性反犹暴力，犹太教堂、商店与住宅被毁，数万犹太人被拘押。迫害从法律歧视升级为公开的国家暴力。",
      tag: "暴行", link: { type: "event", id: "holocaust" }
    },
    {
      date: "1939.08.23", year: 1939, title: "苏德互不侵犯条约", en: "Molotov–Ribbentrop Pact",
      text: "希特勒与斯大林暂时握手，秘密议定书划分东欧势力范围。两周后，德国入侵波兰，苏联随后进入波兰东部。",
      tag: "外交", link: { type: "event", id: "ribbentrop" }
    },
    {
      date: "1939.09.01", year: 1939, title: "德国入侵波兰", en: "Invasion of Poland",
      text: "“白色方案”启动，德军以装甲矛头、俯冲轰炸机与无线电协同撕开防线。9月3日英法对德宣战，欧洲全面战争开始。",
      tag: "爆发", link: { type: "battle", id: "poland" }
    },
    {
      date: "1939.11.30", year: 1939, title: "冬季战争爆发", en: "Winter War",
      text: "苏联进攻芬兰，企图以“安全缓冲”重塑西北边界。芬军以地形、滑雪部队与“莫洛托夫鸡尾酒”顽强抵抗，苏军付出巨大代价。",
      tag: "北欧", link: { type: "event", id: "winterwar" }
    },
    {
      date: "1940.05.10", year: 1940, title: "法国战役", en: "Battle of France",
      text: "德军穿越阿登森林，绕过马奇诺防线，六周内击溃法军与英远征军。6月22日法国停战，维希政权成立，自由法国在伦敦举起抵抗旗帜。",
      tag: "西欧", link: { type: "battle", id: "france" }
    },
    {
      date: "1940.05.26", year: 1940, title: "敦刻尔克大撤退", en: "Dunkirk Evacuation",
      text: "被围的英法联军从海滩撤往英国，军民船只蜂拥而至，约33.8万人获救。它是一场军事失败，却成为英国“继续战斗”的精神支点。",
      tag: "撤退", link: { type: "battle", id: "dunkirk" }
    },
    {
      date: "1940.07.10", year: 1940, title: "不列颠空战", en: "Battle of Britain",
      text: "德国空军试图夺取制空权，为登陆英国铺路。皇家空军借助雷达网、喷火与飓风战斗机苦撑，希特勒的“海狮计划”最终搁浅。",
      tag: "空战", link: { type: "battle", id: "britain" }
    },
    {
      date: "1941.06.22", year: 1941, title: "巴巴罗萨行动", en: "Operation Barbarossa",
      text: "约300万轴心国军队从波罗的海到黑海全线入侵苏联。人类历史上规模最大的陆上战争爆发，也把纳粹的种族灭绝政策推向东欧腹地。",
      tag: "东线", link: { type: "battle", id: "barbarossa" }
    },
    {
      date: "1941.12.07", year: 1941, title: "偷袭珍珠港", en: "Attack on Pearl Harbor",
      text: "日本海军六艘航母突袭美国太平洋舰队基地。次日美国对日宣战，四天后德国对美宣战，战争真正变成全球战争。",
      tag: "太平洋", link: { type: "battle", id: "pearl" }
    },
    {
      date: "1941.12.05", year: 1941, title: "莫斯科城下反攻", en: "Battle of Moscow",
      text: "德军在严寒、泥泞与漫长补给线前止步。苏军投入西伯利亚师团反击，粉碎了“闪电战不可战胜”的神话。",
      tag: "转折", link: { type: "battle", id: "moscow" }
    },
    {
      date: "1942.01.20", year: 1942, title: "万湖会议", en: "Wannsee Conference",
      text: "纳粹官僚在柏林郊外协调“最终解决”的实施。大屠杀不是前线的失控，而是现代国家机器、铁路系统与官僚理性共同参与的种族灭绝。",
      tag: "暴行", link: { type: "event", id: "holocaust" }
    },
    {
      date: "1942.06.04", year: 1942, title: "中途岛海战", en: "Battle of Midway",
      text: "美国海军以三艘航母伏击日本机动部队，击沉四艘日军主力航母。太平洋战争的战略主动权开始转向盟军。",
      tag: "太平洋", link: { type: "battle", id: "midway" }
    },
    {
      date: "1942.08.23", year: 1942, title: "斯大林格勒战役开始", en: "Battle of Stalingrad",
      text: "德军攻入伏尔加河畔的斯大林格勒，苏军以“一步也不后退”的命令死守。城市废墟中的消耗战，最终吞噬了德国第六集团军。",
      tag: "转折", link: { type: "battle", id: "stalingrad" }
    },
    {
      date: "1942.10.23", year: 1942, title: "第二次阿拉曼战役", en: "Second Battle of El Alamein",
      text: "蒙哥马利以压倒性火炮与补给优势击退隆美尔。北非战场的主动权易手，通往突尼斯与西西里的大门被打开。",
      tag: "北非", link: { type: "battle", id: "elalamein" }
    },
    {
      date: "1943.02.02", year: 1943, title: "第六集团军投降", en: "Surrender at Stalingrad",
      text: "保卢斯在百货公司地下室投降，约9万德军被俘。斯大林格勒成为纳粹德国第一次以整集团军规模覆灭的战役。",
      tag: "转折", link: { type: "battle", id: "stalingrad" }
    },
    {
      date: "1943.07.05", year: 1943, title: "库尔斯克会战", en: "Battle of Kursk",
      text: "德军发起“堡垒行动”，撞上苏军纵深防御与雷场。史上最大规模坦克会战后，东线德军再未获得战略主动权。",
      tag: "东线", link: { type: "battle", id: "kursk" }
    },
    {
      date: "1943.09.08", year: 1943, title: "意大利投降", en: "Armistice of Cassibile",
      text: "墨索里尼倒台后，意大利新政府与盟军停战。德国迅速占领意大利北部，战争在意大利半岛继续，直到1945年。",
      tag: "地中海", link: { type: "country", id: "italy" }
    },
    {
      date: "1943.11.28", year: 1943, title: "德黑兰会议", en: "Tehran Conference",
      text: "罗斯福、丘吉尔、斯大林首次会面，确认开辟第二战场的时间表。三大国的交易与分歧，塑造了战后欧洲的轮廓。",
      tag: "外交", link: { type: "event", id: "yalta" }
    },
    {
      date: "1944.06.06", year: 1944, title: "诺曼底登陆", en: "D-Day",
      text: "盟军在诺曼底五个海滩登陆，开辟西欧第二战场。奥马哈滩头的血战、人工港与空中优势，让“堡垒欧洲”出现裂口。",
      tag: "西欧", link: { type: "battle", id: "normandy" }
    },
    {
      date: "1944.06.22", year: 1944, title: "巴格拉季昂行动", en: "Operation Bagration",
      text: "苏军以欺骗、火力与纵深突破摧毁德国中央集团军群，推进数百公里，直抵维斯瓦河。东线德军的最大规模崩溃。",
      tag: "东线", link: { type: "battle", id: "bagration" }
    },
    {
      date: "1944.10.23", year: 1944, title: "莱特湾海战", en: "Battle of Leyte Gulf",
      text: "史上规模最大的海战。日本联合舰队在莱特湾遭到毁灭性打击，神风特攻首次大规模出现，日本的海上帝国走向终结。",
      tag: "太平洋", link: null
    },
    {
      date: "1945.02.04", year: 1945, title: "雅尔塔会议", en: "Yalta Conference",
      text: "三巨头再次会面，讨论德国占领区、波兰边界、联合国与对日作战。雅尔塔既安排了战后秩序，也埋下冷战的裂痕。",
      tag: "外交", link: { type: "event", id: "yalta" }
    },
    {
      date: "1945.04.16", year: 1945, title: "柏林战役", en: "Battle of Berlin",
      text: "苏军付出巨大伤亡攻入柏林。4月30日希特勒自杀，5月8日德国无条件投降，欧洲战争结束。",
      tag: "终局", link: { type: "battle", id: "berlin" }
    },
    {
      date: "1945.08.06", year: 1945, title: "广岛 · 长崎原子弹", en: "Atomic Bombings",
      text: "美国分别向广岛、长崎投下原子弹。8月8日苏联对日宣战并出兵中国东北。核武器时代以最残酷的方式到来。",
      tag: "核时代", link: { type: "event", id: "hiroshima" }
    },
    {
      date: "1945.09.02", year: 1945, title: "日本签署投降书", en: "Japanese Surrender",
      text: "在东京湾密苏里号战列舰上，日本正式签署投降书。第二次世界大战结束，但战争留下的废墟、创伤与秩序重组才刚刚开始。",
      tag: "终战", link: { type: "event", id: "nuremberg" }
    }
  ],

  situation: [
    {
      year: 1939, label: "01", title: "欧洲的堤坝决口",
      lead: "德国入侵波兰，英法宣战却未能在西线发动大规模进攻。一个局部入侵，迅速变成帝国体系的连锁崩塌。",
      axis: "德国、意大利、日本正以“反共产国际协定”松散连接；轴心尚未形成统一战略。",
      allied: "英、法帝国体系仓促应战。美国仍中立，苏联在苏德条约阴影下向西扩张缓冲带。",
      turning: "9月17日苏联进入波兰东部；11月苏联进攻芬兰。战争从东西两面同时改写欧洲地图。",
      focus: "波兰 · 北欧",
      marks: ["波兰战役", "冬季战争"]
    },
    {
      year: 1940, label: "02", title: "闪电战的高峰",
      lead: "德国在六周内击败法国，西欧大陆几乎全部落入纳粹之手。英国孤悬海峡，帝国依靠海空力量与殖民动员继续作战。",
      axis: "德国控制从挪威到比利牛斯的欧洲大陆，意大利在北非与地中海开辟战线。",
      allied: "英国本土遭到空袭，自由法国、流亡政府与英联邦军队在海外继续抵抗。",
      turning: "不列颠空战粉碎“海狮计划”；意大利入侵希腊受挫，德国被迫南下巴尔干，巴巴罗萨的时间表被推迟。",
      focus: "西欧 · 海峡",
      marks: ["法国战役", "敦刻尔克", "不列颠空战"]
    },
    {
      year: 1941, label: "03", title: "真正的全球战争",
      lead: "6月德国入侵苏联，12月日本偷袭珍珠港、美国参战。战争从此同时横跨大西洋、欧洲大陆、北非、太平洋与亚洲大陆。",
      axis: "德国深入苏联腹地，日本席卷东南亚与西太平洋。轴心国在战略上仍然各打各的。",
      allied: "苏联以空间换时间，英国守住地中海门户，美国以《租借法案》成为“民主国家兵工厂”。",
      turning: "莫斯科城下德军首次战略失败；美国参战使工业与资源的天平开始倾斜。",
      focus: "东线 · 太平洋",
      marks: ["巴巴罗萨", "莫斯科", "珍珠港"]
    },
    {
      year: 1942, label: "04", title: "轴心的极限",
      lead: "德国推进到斯大林格勒与高加索，日本扩张到东南亚与所罗门群岛。战线越长，补给、兵力与工业的极限越清晰。",
      axis: "德国第六集团军在斯大林格勒被围，隆美尔在阿拉曼败退；日本在中途岛损失四艘主力航母。",
      allied: "美国工业全面转入战时轨道；苏联把工厂东迁；英国与英联邦在北非集结反攻。",
      turning: "中途岛、斯大林格勒与阿拉曼——三个不同战场，同一年出现战略转折。",
      focus: "伏尔加河 · 太平洋",
      marks: ["中途岛", "斯大林格勒", "阿拉曼"]
    },
    {
      year: 1943, label: "05", title: "反攻的齿轮",
      lead: "盟军在北非取胜、登陆西西里，意大利退出战争；苏军在库尔斯克挡住德军最后一次战略进攻，随后连续推进。",
      axis: "德国被迫两线消耗，意大利战线牵制大量兵力；日本在太平洋转入守势。",
      allied: "美英战略轰炸深入德国本土；苏联军工恢复，T-34与炮兵成为反攻支柱；中国战场继续牵制日本陆军。",
      turning: "库尔斯克之后，东线德军再未掌握战略主动权。1943年是“转折年”的完成。",
      focus: "库尔斯克 · 地中海",
      marks: ["库尔斯克", "意大利投降"]
    },
    {
      year: 1944, label: "06", title: "欧洲的解放与废墟",
      lead: "诺曼底登陆与巴格拉季昂行动同时撕裂德国防线。巴黎解放，东欧被苏军推进，太平洋上美军逼近日本本土。",
      axis: "德国在东西两线同时崩溃，日本失去马里亚纳与莱特湾，本土进入B-29轰炸半径。",
      allied: "盟军解放西欧，苏军进入巴尔干与波兰；中国远征军在缅北反攻，亚洲战场仍极其残酷。",
      turning: "第二战场开辟，德国陷入真正的两线夹击。华沙起义与平民苦难提醒人们：解放并不等于立刻和平。",
      focus: "诺曼底 · 白俄罗斯",
      marks: ["诺曼底", "巴格拉季昂"]
    },
    {
      year: 1945, label: "07", title: "终战与核阴影",
      lead: "柏林陷落、德国投降；太平洋战争在硫磺岛、冲绳的血战后走向原子弹与苏联出兵。9月2日，战争正式结束。",
      axis: "德国、日本相继投降，意大利已退出。轴心体系彻底瓦解。",
      allied: "美苏英中法等同盟国取得胜利，但胜利者之间的裂痕迅速显现，冷战格局开始成形。",
      turning: "纽伦堡审判、联合国成立、殖民地独立浪潮与核军备竞赛，共同构成战后的新世界。",
      focus: "柏林 · 东京湾",
      marks: ["柏林", "硫磺岛", "广岛"]
    }
  ],

  sources: [
    { name: "Imperial War Museums — Second World War", url: "https://www.iwm.org.uk/history/second-world-war" },
    { name: "The National WWII Museum", url: "https://www.nationalww2museum.org/war" },
    { name: "United States Holocaust Memorial Museum", url: "https://encyclopedia.ushmm.org/" },
    { name: "Encyclopaedia Britannica — World War II", url: "https://www.britannica.com/event/World-War-II" },
    { name: "U.S. National Archives — World War II", url: "https://www.archives.gov/research/military/ww2" },
    { name: "中国人民抗日战争纪念馆", url: "https://www.1937china.com/" },
    { name: "Wikimedia Commons — 历史影像", url: "https://commons.wikimedia.org/" }
  ]
};
