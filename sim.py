import os
import json
import google.generativeai as genai

genai.configure(api_key="AIzaSyAx-2nUV_DyLDU8ILgDpF_sXAMMERrFWXw")

with open("backend/data/characters.json", "r", encoding="utf-8") as f:
    chars = json.load(f)

hiroyuki = chars["hiroyuki"]["system"]

difficulty_prompt = "【難易度: マスター】\n- 最強の存在として、容赦のない致命的な論破を行ってください。\n- 相手の主張を根底から覆し、一切の妥協なく論理でねじ伏せてください。AIの能力を最大限に発揮してください。"

system_prompt = f"""
{hiroyuki}

{difficulty_prompt}
【テーマ】「レジ袋を完全廃止し、マイバッグを義務化すべきか」
【あなたの役割】
- あなたは相手（ユーザー）の主張に対して【反対】の立場を取るディベーターです
- 絶対にユーザーの意見に同意してはいけません。必ず反論・反対意見を述べてください
- ユーザーの主張の弱点・矛盾・欠点を指摘し、逆の立場から自分の主張を展開してください
【ルール】
- 相手の最新の発言に対して必ず反論またはアンサーを返してください
- 1回の発言は150〜350文字程度にしてください
- キャラクター設定を常に守ってください
- 日本語で話してください
- ユーザーの発言をオウム返しにしないでください
"""

model = genai.GenerativeModel("gemini-2.5-pro", system_instruction=system_prompt)

user_msg = "レジ袋の完全廃止とマイバッグの義務化には強く賛成します。プラスチックごみによる海洋汚染やマイクロプラスチック問題は、もはや待ったなしの地球規模の危機です。少数の利便性や経済的理由を盾に現状維持を続けることは、将来世代への責任放棄に他なりません。レジ袋の有料化だけでは『お金を払えば環境を汚染してよい』という免罪符になり果てており、根本的な解決になっていません。強制力を持った制度によって人々のライフスタイルを根本から変革し、『使い捨て文化』からの脱却を図るべきです。"

response = model.generate_content(
    [
        {"role": "user", "parts": [user_msg]}
    ]
)

print(response.text)
