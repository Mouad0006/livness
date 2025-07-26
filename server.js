const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send(`
    <html lang="ar" dir="rtl">
      <head>
        <title>BLS Liveness Bridge</title>
        <meta charset="utf-8"/>
        <style>
            body { font-family:sans-serif; background: #fafbfe; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 24px 30px 40px 30px; border-radius: 18px; box-shadow: 0 2px 18px #0001; }
            textarea { width:95%; min-height:60px; font-size:1.1em; margin-bottom:12px;}
            button { background:#2366f2; color:#fff; padding:10px 30px; border:none; border-radius:7px; font-size:1.1em; cursor:pointer; margin-bottom:20px;}
            #cam { margin:15px 0; border-radius: 10px; }
            #canvas { display:none;}
            .hide {display:none;}
        </style>
      </head>
      <body>
        <div class="container">
        <h2>جسر السيلفي - BLS Liveness Bridge</h2>
        <form action="/liveness" method="POST">
          <label>ألصق هنا كود الجلسة المستخرج من جهازك الأصلي:</label><br>
          <textarea name="code" required placeholder="ألصق الكود هنا"></textarea><br>
          <button type="submit">بدء جلسة السيلفي</button>
        </form>
        </div>
      </body>
    </html>
    `);
});

app.post('/liveness', (req, res) => {
    let code = req.body.code?.trim();
    if (!code) {
        return res.send('يرجى إدخال كود صحيح.');
    }
    let data;
    try {
        // يدعم العربية وجميع الرموز
        let decoded = Buffer.from(code, 'base64').toString();
        data = JSON.parse(decodeURIComponent(decoded));
    } catch (e) {
        return res.send('❌ كود غير صحيح أو غير قابل للفك!');
    }

    res.send(`
    <html lang="ar" dir="rtl">
      <head>
        <title>جلسة السيلفي</title>
        <meta charset="utf-8"/>
        <style>
            body { font-family:sans-serif; background: #fafbfe; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 24px 30px 40px 30px; border-radius: 18px; box-shadow: 0 2px 18px #0001; }
            button { background:#2366f2; color:#fff; padding:10px 30px; border:none; border-radius:7px; font-size:1.1em; cursor:pointer; margin-bottom:20px;}
            #cam { margin:15px 0; border-radius: 10px; }
            #canvas { display:none;}
        </style>
      </head>
      <body>
        <div class="container">
        <h3>جلسة السيلفي (Bridge)</h3>
        <form id="livenessForm" onsubmit="return false;">
          <input type="hidden" id="AppointmentData" value="${data.appointmentData || ''}">
          <input type="hidden" id="LivenessData" value="${data.livenessData || ''}">
          <input type="hidden" name="__RequestVerificationToken" value="${data.rToken || ''}">
          <div>
            <button type="button" id="startBtn">ابدأ التحقق بالسيلفي</button>
          </div>
          <video id="cam" width="340" height="240" autoplay class="hide"></video>
          <canvas id="canvas" width="340" height="240"></canvas>
          <div id="result"></div>
        </form>
        </div>
        <script>
        // إذا ضغط المستخدم "ابدأ" نطلب إذن الكاميرا
        document.getElementById('startBtn').onclick = function startLiveness() {
            var video = document.getElementById('cam');
            var btn = document.getElementById('startBtn');
            video.classList.remove("hide");
            btn.disabled = true;
            btn.innerText = "يتم تشغيل الكاميرا...";
            navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                btn.innerText = "انتظر... يتم التقاط الصورة";
                setTimeout(() => {
                    var canvas = document.getElementById('canvas');
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.classList.add("hide");
                    let img = canvas.toDataURL("image/png");
                    document.getElementById('result').innerHTML = '<p>✅ تم التقاط السيلفي!</p><img src="'+img+'" width="140"/><br><button onclick="downloadCode()">توليد كود العودة</button>';
                    window._selfieData = img;
                    btn.innerText = "تم الانتهاء";
                }, 2200); // بعد ثانيتين وربع
            }).catch(e => {
                alert('❌ لا يمكن الوصول للكاميرا: ' + e);
                btn.innerText = "ابدأ التحقق بالسيلفي";
                btn.disabled = false;
            });
        }

        function downloadCode() {
            let selfieData = window._selfieData || '';
            let payload = {
                ...${JSON.stringify(data)},
                selfieData: selfieData,
                status: "done"
            };
            function base64EncodeUnicode(str) { return btoa(encodeURIComponent(str)); }
            let code = base64EncodeUnicode(JSON.stringify(payload));
            let ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            alert("✅ تم نسخ كود العودة! يمكنك الآن لصقه في جهازك الأصلي.");
        }
        </script>
      </body>
    </html>
    `);
});

app.listen(port, () => {
    console.log(`Liveness Bridge running at http://localhost:${port}`);
});

