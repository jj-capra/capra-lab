/* ---------- silhouettes: 35 archetypes, drawn facing right in a 120x72 box ---------- */
export const SHAPES = {
"spider": "M46 40 Q46 30 57 30 Q68 30 68 40 Q68 52 57 52 Q46 52 46 40 Z M44 36 Q36 30 34 24 M34 24 L28 34 M45 41 Q35 39 30 40 M30 40 L26 50 M45 46 Q36 48 32 53 M32 53 L30 62 M48 50 Q44 56 42 60 M42 60 L46 66 M69 36 Q77 30 80 24 M80 24 L86 34 M68 41 Q78 39 83 40 M83 40 L87 50 M68 46 Q77 48 81 53 M81 53 L83 62 M65 50 Q69 56 71 60 M71 60 L67 66 M68 36 Q76 33 78 36 Q73 39 68 38 Z",
"scorpion": "M40 52 Q40 44 50 44 L74 44 Q82 44 84 50 Q84 57 76 57 L48 57 Q40 57 40 52 Z M42 47 Q33 42 26 44 M26 44 L20 38 M20 38 L26 36 M42 54 Q33 58 27 56 M27 56 L21 61 M21 61 L27 62 M50 57 L48 66 M58 57 L57 66 M66 57 L66 66 M74 57 L75 66 M50 44 L48 36 M58 44 L57 36 M66 44 L67 36 M84 50 Q93 46 96 38 Q98 28 92 22 Q86 17 80 21 Q76 26 81 30 Q86 32 88 28",
"centipede": "M10 54 Q26 44 44 50 Q62 56 80 48 Q96 41 106 44 Q112 46 110 51 Q106 54 100 52 Q88 48 78 54 Q60 63 42 57 Q26 52 14 60 Z M104 44 L112 38 M104 49 L113 48 M18 52 L14 44 M26 50 L23 42 M34 50 L32 42 M42 52 L41 44 M50 54 L50 46 M58 56 L59 48 M66 56 L68 48 M74 54 L77 47 M82 51 L86 44 M90 49 L94 43 M18 58 L14 66 M26 56 L24 64 M34 56 L33 64 M42 58 L42 66 M50 60 L51 66 M58 61 L60 66 M66 60 L69 66 M74 58 L78 64 M82 55 L86 62 M90 52 L95 60",
"wasp": "M24 42 Q24 34 34 34 Q44 34 44 42 Q44 50 34 50 Q24 50 24 42 Z M44 42 L54 42 M54 36 Q68 30 82 38 Q94 45 90 54 Q84 62 72 56 Q58 48 54 44 Z M22 38 L12 32 M22 46 L12 50 M28 34 L24 24 M38 34 L42 24 M46 38 Q56 24 72 18 Q86 14 90 20 Q84 28 68 34 Q56 38 48 44 M50 44 Q60 34 76 32 Q86 31 88 36 Q82 42 70 44 Q58 46 52 48 M88 52 L100 62 M36 50 L34 60 M70 56 L70 64",
"dragonfly": "M14 46 Q14 40 22 40 Q30 40 30 46 Q30 52 22 52 Q14 52 14 46 Z M30 44 Q40 42 48 45 Q42 49 30 48 Z M48 44 Q74 42 106 45 Q113 46 113 47 Q113 48 106 50 Q74 53 48 49 Z M12 42 L6 38 M12 50 L6 54 M46 44 Q58 30 80 26 Q94 24 97 29 Q91 35 76 38 Q58 41 48 46 Z M48 47 Q60 60 82 63 Q95 65 97 60 Q91 55 76 53 Q58 50 47 48 Z M40 44 Q52 32 70 29 M40 49 Q52 60 70 63",
"beetle": "M34 46 Q34 28 58 28 Q82 28 82 46 Q82 62 58 62 Q34 62 34 46 Z M58 28 L58 62 M42 32 L44 58 M74 32 L72 58 M34 40 Q24 34 18 32 M34 52 Q24 56 18 58 M40 32 L34 22 M76 32 L82 22 M42 60 L36 66 M74 60 L80 66 M20 32 Q12 28 8 32 Q14 36 20 36 Z M20 58 Q12 60 8 64 M82 42 Q92 38 96 32 M82 48 Q92 48 97 44",
"frog": "M38 60 Q30 50 36 40 Q42 28 58 28 Q74 28 80 40 Q86 50 78 60 Q68 65 58 65 Q48 65 38 60 Z M44 34 Q44 27 51 27 Q58 27 58 34 Q58 40 51 40 Q44 40 44 34 Z M62 34 Q62 27 69 27 Q76 27 76 34 Q76 40 69 40 Q62 40 62 34 Z M38 50 Q24 48 16 56 Q10 64 18 66 Q26 64 32 58 M18 66 L10 68 M18 66 L14 60 M80 50 Q94 48 102 56 Q108 64 100 66 Q92 64 86 58 M100 66 L108 68 M100 66 L104 60 M46 62 L42 68 M70 62 L74 68",
"eurypterid": "M26 44 Q26 32 46 32 Q64 32 64 44 Q64 56 46 56 Q26 56 26 44 Z M64 40 Q80 38 94 42 Q103 45 103 48 Q103 51 94 54 Q80 58 64 52 Z M103 48 L117 44 M103 48 L117 54 M28 38 Q16 30 10 22 Q6 14 12 13 Q19 15 20 24 M20 24 L14 20 M30 50 Q18 56 12 64 Q8 72 14 71 Q21 67 24 58 M34 56 L32 64 M42 56 L41 66 M50 56 L51 66 M58 55 L60 64 M36 32 L35 24 M52 32 L54 24",
"armourfish": "M8 40 L16 30 L18 42 Q16 46 18 52 L8 48 Q22 50 34 46 Q28 38 30 30 L44 32 L46 28 L62 34 Q80 36 96 42 Q104 45 104 48 Q96 54 80 56 Q58 58 38 52 Q22 50 8 48 Z M34 46 L30 30 M46 30 L44 44 M58 32 L58 46 M96 44 L104 36 L100 48",
"sailback": "M16 8 Q40 2 62 6 Q82 10 92 22 L88 30 Q78 20 60 16 Q40 12 22 18 Z M12 44 Q12 34 26 30 L50 26 Q70 24 84 28 Q94 31 98 38 L106 34 L102 42 Q98 48 88 48 L86 66 L79 66 L80 50 L62 50 L62 66 L55 66 L56 50 L38 50 L38 66 L31 66 L32 48 L20 46 L18 66 L11 66 Z M18 16 L22 30 M34 10 L36 27 M52 7 L52 25 M70 9 L68 24 M86 16 L82 27",
"gorgon": "M10 42 Q10 32 24 28 L50 24 Q68 22 80 26 Q86 28 92 24 L102 16 Q108 13 110 18 Q110 24 104 28 L98 34 Q98 40 92 42 L90 66 L82 66 L84 48 L64 48 L64 66 L56 66 L57 48 L38 48 L38 66 L30 66 L31 46 L18 44 L16 66 L8 66 Z M96 32 L93 46 M101 31 L99 44 M100 22 L94 26",
"amphibian": "M12 50 Q10 42 22 40 L48 38 Q66 36 80 40 Q90 43 96 40 L104 36 L106 42 Q102 48 94 48 L92 58 L86 58 L87 50 L66 51 L66 60 L60 60 L61 51 L42 51 L42 60 L36 60 L37 50 L24 50 L22 60 L16 60 Z M96 40 Q90 34 82 36 M14 50 Q6 56 2 64",
"orthocone": "M6 34 L96 44 Q106 46 106 50 Q106 54 96 56 L6 46 Z M20 36 L20 45 M36 38 L36 47 M52 40 L52 49 M68 41 L68 50 M84 43 L84 52 M106 46 Q114 42 118 36 M106 48 Q116 48 120 44 M106 52 Q114 56 116 62 M104 54 Q108 62 106 68 M100 54 Q100 62 96 68",
"bat": "M52 34 Q52 26 60 26 Q68 26 68 34 Q68 44 60 44 Q52 44 52 34 Z M52 32 Q34 16 14 18 Q6 19 8 26 Q10 36 24 40 Q38 44 52 40 Z M68 32 Q86 16 106 18 Q114 19 112 26 Q110 36 96 40 Q82 44 68 40 Z M24 22 L22 40 M38 20 L36 42 M96 22 L98 40 M82 20 L84 42 M56 26 L52 18 L58 24 M64 26 L68 18 L66 24 M58 44 L56 56 M62 44 L64 56",
"anteater": "M14 44 Q14 34 28 30 L52 26 Q70 24 82 28 Q92 31 98 36 L114 44 L112 50 L96 48 Q92 48 90 45 L88 66 L80 66 L82 48 L62 48 L62 66 L54 66 L55 48 L38 48 L38 66 L30 66 L31 46 Q20 50 14 58 Q10 64 16 66 L26 60 M98 36 Q106 38 114 44 M100 41 L110 46",
"cat": "M6 24 Q16 23 24 34 L34 35 Q48 31 62 32 L78 33 Q86 33 90 28 L92 19 L96 25 L100 19 L104 25 Q109 27 107 33 Q104 39 96 39 L94 46 L91 66 L85 66 L86 45 L67 46 L67 66 L61 66 L62 46 L45 46 L45 66 L39 66 L40 45 L29 43 L27 66 L21 66 L24 41 Q15 36 9 33 Z",
"canid": "M4 26 Q14 21 22 32 L32 34 Q48 29 62 31 L80 32 Q88 31 92 24 L94 15 L98 23 L102 15 L106 23 Q115 26 117 32 L105 36 Q100 40 98 45 L95 66 L89 66 L90 47 L69 47 L69 66 L63 66 L64 47 L47 47 L47 66 L41 66 L42 45 L29 43 L27 66 L21 66 L24 40 Q12 33 8 33 Z",
"bear": "M16 44 Q14 28 32 22 L58 19 Q76 17 86 23 L90 16 L96 22 L101 16 L106 23 Q114 27 111 35 Q106 41 97 41 L95 66 L87 66 L88 47 L67 47 L67 66 L59 66 L60 47 L41 47 L41 66 L33 66 L34 45 L22 45 L20 66 L14 66 Z",
"elephant": "M12 32 Q10 20 26 16 L58 13 Q78 12 88 18 Q97 23 101 31 Q109 34 111 42 Q113 53 109 63 Q107 69 101 66 Q105 55 103 45 Q98 47 95 45 L93 66 L85 66 L86 48 L68 48 L68 66 L60 66 L61 48 L42 48 L42 66 L34 66 L35 46 L22 44 L21 66 L13 66 L15 42 Z M100 47 L112 60",
"rhino": "M12 42 Q10 30 24 25 L52 21 Q74 19 88 24 Q98 28 103 33 L105 23 L109 12 L115 25 L113 37 Q109 44 96 44 L94 66 L86 66 L87 48 L68 48 L68 66 L60 66 L61 48 L42 48 L42 66 L34 66 L35 46 L22 45 L20 66 L13 66 Z",
"bovid": "M14 38 Q14 28 26 25 L54 22 Q74 21 86 25 Q94 28 98 24 Q104 20 107 27 Q107 35 100 39 L96 43 L95 66 L88 66 L89 47 L68 47 L68 66 L61 66 L62 47 L44 47 L44 66 L37 66 L38 46 L24 44 L22 66 L15 66 Z M99 23 Q95 9 83 7 M104 25 Q110 12 99 4",
"camel": "M14 40 Q14 30 24 28 L40 20 Q46 14 54 20 L70 26 Q78 26 84 22 L92 12 Q98 8 102 12 Q104 18 98 22 L94 30 Q92 38 88 40 L86 66 L79 66 L81 46 L62 46 L62 66 L55 66 L56 46 L40 46 L40 66 L33 66 L34 44 L22 44 L21 66 L14 66 Z",
"giraffe": "M20 50 Q20 42 29 40 L45 38 Q53 36 57 27 L67 8 Q69 2 75 3 Q81 5 79 12 L71 30 L67 41 Q65 49 58 51 L56 66 L50 66 L51 52 L40 52 L40 66 L34 66 L35 52 L29 50 L27 66 L21 66 Z M72 2 Q82 0 84 7 Q82 12 75 11 Q70 9 72 2 Z M74 2 L72 -1 M81 2 L82 -2",
"deer": "M12 40 Q12 30 24 27 L52 24 Q70 22 82 26 Q90 28 96 24 Q102 20 105 27 Q105 35 98 39 L94 43 L93 66 L86 66 L87 47 L68 47 L68 66 L61 66 L62 47 L44 47 L44 66 L37 66 L38 46 L24 44 L22 66 L15 66 Z M96 22 L88 9 M88 9 L78 5 M88 9 L88 1 M101 21 L107 6 M107 6 L116 3 M107 6 L104 0",
"croc": "M4 48 Q10 42 20 42 L34 40 Q40 34 50 36 L74 38 Q86 38 94 42 L118 46 L118 52 L94 52 Q86 56 74 54 L64 54 L62 62 L56 62 L58 52 L44 52 L42 62 L36 62 L38 51 L26 50 L24 60 L18 60 L20 48 Q12 52 4 54 Z",
"snake": "M8 58 Q4 46 16 42 Q30 38 40 44 Q50 50 62 46 Q74 42 78 32 Q82 20 96 20 Q110 20 112 30 Q114 40 104 42 Q96 43 94 36 Q92 28 84 32 Q78 36 76 46 Q72 56 58 56 Q46 56 38 52 Q28 47 20 52 Q14 56 16 62 Z",
"raptorbird": "M4 24 L20 17 L18 28 Q23 35 35 37 L53 35 Q63 29 75 29 L89 31 Q97 31 101 27 L111 22 L115 27 L106 33 Q100 39 88 39 L72 39 Q60 45 46 43 Q28 41 18 35 L21 43 L4 36 Z",
"groundbird": "M38 40 Q38 25 58 23 Q78 21 82 36 Q84 49 68 53 Q48 55 40 48 Z M77 32 Q86 23 88 12 M82 4 Q95 2 97 9 Q95 14 86 14 Q80 12 82 4 Z M95 7 L104 9 L95 12 M54 53 L51 66 M52 66 L44 68 M68 52 L71 66 M71 66 L63 68",
"penguin": "M46 64 Q38 55 40 41 Q42 22 57 16 Q69 10 79 19 Q87 28 85 45 Q83 58 74 64 Z M81 21 L96 25 L81 30 M43 38 Q34 49 41 58 M52 64 L43 70 L57 68 M70 64 L65 70 L80 68",
"whale": "M8 30 L20 22 L18 34 Q30 26 56 26 Q86 26 102 34 Q114 40 114 44 Q112 50 100 52 Q80 58 56 56 Q30 54 16 46 L18 44 L8 38 Z M66 26 L70 18 L74 27",
"orca": "M8 32 L20 24 L18 36 Q32 28 58 28 Q88 28 104 36 Q116 42 116 46 Q114 50 102 52 Q82 58 58 56 Q32 54 18 46 L20 44 L8 40 Z M62 28 L60 10 L74 28",
"shark": "M6 34 L18 22 L20 36 L14 40 L20 44 L18 58 L6 46 Q20 48 34 48 Q56 50 78 46 Q98 42 114 36 Q104 30 84 28 Q56 26 34 32 Z M56 28 L58 8 L72 29 M52 48 L50 60 L62 50",
"fish": "M8 28 L20 38 L8 50 Q22 48 32 44 Q50 34 72 32 Q94 30 110 36 L118 38 L110 42 Q94 48 72 48 Q50 48 32 44 Z M50 33 L52 16 L66 32 M52 46 L50 58 L64 47",
"turtle": "M10 50 Q14 38 30 32 Q52 24 74 32 Q88 38 92 50 L96 46 Q106 44 112 48 Q106 54 96 52 L92 54 Q70 60 50 58 Q26 56 14 54 Z M28 54 L24 64 L34 58 M66 56 L64 66 L74 58",
"pinniped": "M12 52 Q6 40 20 34 Q36 26 60 28 Q84 30 98 38 Q108 44 106 50 Q100 56 86 58 Q56 62 30 60 Q18 58 12 52 Z M97 45 L95 62 M104 45 L104 60 M34 56 Q28 67 17 67 M58 58 Q54 69 43 69",
"cephalopod": "M40 20 Q56 12 70 20 Q82 28 78 40 L74 46 Q66 50 56 48 Q46 46 42 38 Z M46 48 Q40 60 28 64 M54 50 Q50 62 40 68 M62 50 Q62 62 56 68 M70 46 Q76 58 88 62 M74 42 Q86 50 98 50",
"jelly": "M32 34 Q32 16 54 16 Q76 16 76 34 Q76 40 70 42 L38 42 Q32 40 32 34 Z M40 42 Q36 56 30 68 M48 42 Q46 58 44 68 M58 42 Q60 58 62 68 M66 42 Q70 56 78 68",
"bug": "M40 30 Q40 23 47 23 Q54 23 54 30 Q54 39 47 39 Q40 39 40 30 Z M52 25 Q64 20 68 27 Q61 31 52 29 Z M40 26 L31 20 M40 34 L31 41 M44 23 L41 13 M51 23 L56 13 M44 39 L41 49 M51 39 L55 49 M78 46 Q78 41 83 41 Q88 41 88 46 Q88 52 83 52 Q78 52 78 46 Z M86 42 Q95 38 98 43 Q93 46 86 45 Z M78 43 L71 39 M78 49 L71 54 M81 41 L79 33 M86 41 L89 33 M22 56 Q22 52 26 52 Q30 52 30 56 Q30 61 26 61 Q22 61 22 56 Z M29 53 Q36 49 38 53 Q34 56 29 55 Z M22 54 L16 51 M22 59 L16 63 M25 52 L23 45 M29 52 L31 45",
"critter": "M46 66 Q38 54 42 38 Q44 24 56 18 Q60 6 72 6 Q84 6 84 20 L91 11 L95 18 L86 27 Q90 45 78 57 L76 66 L67 66 L69 50 L58 54 L54 66 Z M43 42 Q31 50 26 66",
"ape": "M26 62 Q20 48 28 36 Q34 24 50 22 L66 20 Q80 20 86 28 L92 24 L96 28 L92 34 Q94 44 86 50 L82 62 L74 62 L76 48 L56 50 L54 62 L46 62 L48 46 Q38 50 34 62 Z",
"sloth": "M14 62 Q10 44 20 32 Q30 18 52 16 L74 18 Q88 22 92 32 L98 28 L102 32 L96 38 Q96 48 88 54 L86 62 L76 62 L78 50 L52 52 L48 62 L38 62 L40 46 Q26 50 24 62 Z M14 62 L8 68 M20 62 L16 70",
"kangaroo": "M8 62 Q18 54 34 52 Q44 50 50 42 Q54 30 62 26 Q66 16 76 18 Q84 20 82 28 L86 32 L80 34 Q78 42 70 46 L66 56 Q68 62 74 66 L64 66 L58 56 L46 58 L44 66 L36 66 L38 58 Q22 60 10 68 Z",
"theropod": "M4 28 Q16 26 28 32 L44 36 Q54 30 66 30 Q80 30 88 24 L98 16 Q110 12 114 18 Q116 26 108 28 L96 32 Q92 40 84 44 L80 50 Q82 60 88 66 L78 66 L72 52 L60 52 L58 62 Q60 66 64 66 L52 66 L50 50 Q42 44 40 38 L26 40 Q14 38 4 34 Z",
"raptordino": "M4 24 Q18 24 30 30 L46 36 Q54 32 64 32 Q74 32 80 28 L92 20 Q102 16 106 22 Q108 28 100 30 L88 34 Q84 40 78 42 L74 52 Q76 60 82 66 L72 66 L68 52 L58 52 L56 62 Q58 66 62 66 L52 66 L50 48 Q42 42 40 38 L24 38 Q12 34 4 30 Z",
"ceratopsian": "M12 40 Q12 28 26 24 L52 20 Q70 18 80 22 Q84 10 94 8 Q105 6 107 15 Q109 23 102 27 L111 31 L100 33 Q96 43 86 45 L84 66 L76 66 L77 48 L58 48 L58 66 L50 66 L51 48 L34 46 L32 66 L24 66 L25 44 Q14 46 12 40 Z M97 17 L106 9 M101 25 L112 21",
"ankylosaur": "M6 44 L16 38 L8 34 Q18 30 30 30 L52 26 Q74 24 88 30 Q100 34 104 42 L112 40 L106 48 Q100 52 90 52 L88 62 L82 62 L83 54 L64 54 L64 62 L58 62 L59 54 L40 54 L40 62 L34 62 L35 52 L22 50 L20 60 L14 60 L16 48 Z M34 28 L36 22 M50 25 L52 18 M66 24 L68 17 M82 27 L84 21",
"sauropod": "M6 52 Q12 40 26 38 L48 36 Q62 34 70 26 L82 12 Q88 4 96 6 Q104 8 100 16 L88 30 L80 40 Q78 48 72 52 L70 66 L62 66 L63 52 L46 52 L46 66 L38 66 L39 52 L26 50 L24 66 L16 66 L18 48 Q10 56 4 60 Z",
"hadrosaur": "M4 32 Q16 30 28 36 L44 42 Q52 36 62 36 Q72 34 78 28 L86 18 Q92 10 100 12 L104 18 L96 22 L92 30 Q88 38 80 42 L76 52 Q78 60 84 66 L74 66 L70 52 L60 52 L58 62 Q60 66 64 66 L52 66 L50 50 Q42 46 40 42 L24 42 Q12 40 4 36 Z",
"pterosaur": "M4 20 Q24 24 46 32 L58 28 Q66 24 76 26 L88 28 Q98 28 104 24 L116 18 L118 24 L106 30 L92 34 L78 34 Q70 42 58 42 Q40 42 22 34 Q10 28 4 20 Z M60 42 L58 56 L54 58 M68 40 L72 54 L68 56 M76 30 L90 20 L78 26",
"marinereptile": "M10 44 Q4 34 16 31 Q32 28 48 33 Q62 38 73 33 Q85 27 93 17 Q99 7 109 8 Q117 9 116 15 Q113 21 105 19 Q98 18 94 27 Q87 40 73 44 Q58 48 45 45 Q30 42 19 47 L8 54 Z M31 45 L22 58 L39 51 M58 45 L54 59 L70 49 M37 36 L30 25 L47 32 M64 35 L60 24 L77 31"
};

export const SHAPE_MAP = {
"anteater": [
"Giant anteater",
],
"bat": [
"Vampire bat",
],
"orthocone": [
"Cameroceras",
],
"amphibian": [
"Eryops",
"Prionosuchus",
"Diplocaulus",
],
"gorgon": [
"Inostrancevia",
"Gorgonops",
"Anteosaurus",
"Titanophoneus",
],
"sailback": [
"Dimetrodon",
"Edaphosaurus",
],
"armourfish": [
"Dunkleosteus",
"Bothriolepis",
],
"eurypterid": [
"Jaekelopterus",
],
"frog": [
"Golden poison frog",
"Cane toad",
],
"beetle": [
"Hercules beetle",
],
"dragonfly": [
"Dragonfly",
"Meganeura",
],
"wasp": [
"Tarantula hawk wasp",
"Velvet ant",
"Yellowjacket swarm",
],
"centipede": [
"Giant centipede",
"Arthropleura",
],
"scorpion": [
"Emperor scorpion",
"Pulmonoscorpius",
],
"spider": [
"Brazilian wandering spider",
"Sydney funnel-web",
"Goliath birdeater",
"Black widow",
],
"cat": [
"Fossa",
"Cheetah",
"African lion",
"Bengal tiger",
"Jaguar",
"Snow leopard",
"Smilodon",
"Cave lion",
"Marsupial lion",
"Cougar",
"Eurasian lynx",
"Homotherium",
"American lion",
"Thylacine"
],
"canid": [
"Gray wolf",
"African wild dog",
"Spotted hyena",
"Dire wolf",
"Cave hyena",
"Dingo",
"Pachycrocuta"
],
"bear": [
"Tasmanian devil",
"Polar bear",
"Grizzly bear",
"Wolverine",
"Honey badger",
"Short-faced bear",
"Cave bear",
"Giant beaver",
"Giant river otter",
"Wild boar"
],
"elephant": [
"African elephant",
"Woolly mammoth",
"American mastodon",
"Columbian mammoth",
"Palaeoloxodon"
],
"rhino": [
"Scutosaurus",
"Cotylorhynchus",
"Moschops",
"Estemmenosuchus",
"Lystrosaurus",
"White rhinoceros",
"Hippopotamus",
"Woolly rhinoceros",
"Elasmotherium",
"Toxodon",
"Black rhinoceros",
"Diprotodon",
"Lowland tapir"
],
"bovid": [
"Cape buffalo",
"Yak",
"Bighorn sheep",
"Musk ox",
"Gemsbok",
"Alpine ibex",
"American bison",
"Steppe bison",
"Aurochs",
"Saiga antelope",
"Wildebeest herd",
"Pronghorn",
"Plains zebra",
"Springbok",
"Markhor",
"Takin"
],
"camel": [
"Dromedary camel",
"Titanotylopus"
],
"giraffe": [
"Giraffe",
"Macrauchenia"
],
"deer": [
"Caribou",
"Moose",
"Irish elk"
],
"croc": [
"Saltwater crocodile",
"Nile crocodile",
"Komodo dragon",
"Black caiman",
"Megalania",
"Quinkana",
"Deinosuchus",
"Sarcosuchus",
"Gila monster"
],
"snake": [
"Inland taipan",
"Coastal taipan",
"Eastern brown snake",
"Russell's viper",
"Saw-scaled viper",
"Gaboon viper",
"Fer-de-lance",
"Bushmaster",
"Puff adder",
"Boomslang",
"Tiger snake",
"Eastern diamondback",
"Banded krait",
"Indian cobra",
"Mozambique spitting cobra",
"Belcher's sea snake",
"Boa constrictor",
"Burmese python",
"African rock python",
"Green anaconda",
"King cobra",
"Sidewinder rattlesnake",
"Reticulated python",
"Black mamba",
"Electric eel"
],
"raptorbird": [
"Hooded pitohui",
"Coelurosauravus",
"Peregrine falcon",
"Golden eagle",
"Harpy eagle",
"Andean condor",
"Haast's eagle",
"Arctic tern",
"Snowy owl",
"Osprey",
"Griffon vulture",
"Teratorn",
"Pelagornis"
],
"groundbird": [
"Ostrich",
"Cassowary",
"Roadrunner",
"Secretarybird"
],
"penguin": [
"Emperor penguin",
"Great auk",
"Hesperornis"
],
"whale": [
"Blue whale",
"Sperm whale",
"Bowhead whale",
"Steller's sea cow",
"Livyatan",
"Narwhal",
"Beluga"
],
"orca": [
"Orca"
],
"shark": [
"Helicoprion",
"Cladoselache",
"Orthacanthus",
"Stethacanthus",
"Great white shark",
"Bull shark",
"Megalodon",
"Tiger shark",
"Great hammerhead"
],
"fish": [
"Stonefish",
"Pufferfish",
"Lionfish",
"Rhizodus",
"Sailfish",
"Piranha shoal",
"Xiphactinus",
"Goliath tigerfish",
"Giant manta ray"
],
"turtle": [
"Cone snail",
"Leatherback turtle",
"Archelon",
"Megalochelys"
],
"pinniped": [
"Platypus",
"Walrus",
"Leopard seal"
],
"cephalopod": [
"Blue-ringed octopus",
"Giant Pacific octopus",
"Colossal squid",
"Humboldt squid"
],
"jelly": [
"Irukandji jellyfish",
"Box jellyfish",
"Portuguese man o' war"
],
"bug": [
"Bullet ant",
"Driver ant column",
"Fire ant raft",
"Mosquito swarm",
"Tsetse swarm",
"Giant water bug",
"Praying mantis",
"Mantis shrimp",
"Army ant colony",
"Desert locust swarm",
"Killer bee swarm",
"Giant hornet swarm",
"Deathstalker scorpion"
],
"critter": [
"Slow loris",
"Meerkat clan",
"Banded mongoose"
],
"ape": [
"Chimpanzee",
"Mountain gorilla",
"Orangutan",
"Baboon troop"
],
"sloth": [
"Megatherium"
],
"kangaroo": [
"Giant short-faced kangaroo",
"Red kangaroo"
],
"theropod": [
"Tyrannosaurus rex",
"Spinosaurus",
"Carnotaurus",
"Giganotosaurus",
"Nanuqsaurus",
"Majungasaurus",
"Tarbosaurus"
],
"raptordino": [
"Velociraptor",
"Deinonychus",
"Troodon",
"Utahraptor",
"Gallimimus",
"Dakotaraptor",
"Struthiomimus",
"Microraptor",
"Oviraptor",
"Hypsilophodon",
"Anzu",
"Therizinosaurus"
],
"ceratopsian": [
"Triceratops",
"Pachyrhinosaurus",
"Styracosaurus",
"Protoceratops"
],
"ankylosaur": [
"Ankylosaurus",
"Nodosaurus",
"Euoplocephalus",
"Glyptodon",
"Doedicurus"
],
"sauropod": [
"Argentinosaurus",
"Alamosaurus"
],
"hadrosaur": [
"Edmontosaurus",
"Saurolophus",
"Parasaurolophus",
"Iguanodon",
"Pachycephalosaurus"
],
"pterosaur": [
"Quetzalcoatlus",
"Pteranodon",
"Ornithocheirus"
],
"marinereptile": [
"Mosasaurus",
"Elasmosaurus",
"Kronosaurus",
"Tylosaurus"
]
};
export const SHAPE_OF = {};
for (const k in SHAPE_MAP) SHAPE_MAP[k].forEach(n => SHAPE_OF[n] = k);

export const SHIELD = "M14 5 H106 A6 6 0 0 1 112 11 V92 C112 118 86 134 60 145 C34 134 8 118 8 92 V11 A6 6 0 0 1 14 5 Z";
export const INNER  = "M18 11 H102 A3 3 0 0 1 105 14 V90 C105 111 82 125 60 135 C38 125 15 111 15 90 V14 A3 3 0 0 1 18 11 Z";
