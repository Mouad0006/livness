const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send(`
    <html>
      <head>
        <title>BLS Liveness Bridge</title>
        <meta charset="utf-8"/>
      </head>
      <body style="font-family:sans-serif">
        <h2>أدخل كود الجلسة المستخرج من جهازك الأصلي</h2>
        <form action="/liveness" method="POST">
          <textarea name="code" rows="5" cols="80" placeholder="ألصق الكود هنا"></textarea><br><br>
          <button type="submit">بدء جلسة السيلفي</button>
        </form>
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
        // فك الكود بالطريقة الصحيحة (يدعم العربية)
        let decoded = Buffer.from(code, 'base64').toString();
        data = JSON.parse(decodeURIComponent(decoded));
    } catch (e) {
        return res.send('كود غير صحيح أو غير قابل للفك!');
    }

    res.send(`
    <html>
      <head>
        <title>Liveness Session</title>
        <meta charset="utf-8"/>
      </head>
      <body>
        <h3>جلسة السيلفي (Bridge)</h3>
        <form id="livenessForm">
          <input type="hidden" id="AppointmentData" value="${data.appointmentData || ''}">
          <input type="hidden" id="LivenessData" value="${data.livenessData || ''}">
          <input type="hidden" name="__RequestVerificationToken" value="${data.rToken || ''}">
          <div>
            <button type="button" onclick="startLiveness()">ابدأ التحقق بالسيلفي</button>
          </div>
          <video id="cam" width="320" height="240" autoplay style="display:none"></video>
          <canvas id="canvas" width="320" height="240" style="display:none"></canvas>
          <div id="result"></div>
        </form>
        <script>
        function startLiveness() {
            var video = document.getElementById('cam');
            video.style.display = "block";
            navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                setTimeout(() => {
                    var canvas = document.getElementById('canvas');
                    canvas.style.display = "block";
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    video.srcObject.getTracks().forEach(track => track.stop());
                    let img = canvas.toDataURL("image/png");
                    document.getElementById('result').innerHTML = '<p>تم التقاط السيلفي!</p><img src="'+img+'" width="150"/><br><button onclick="downloadCode()">توليد كود العودة</button>';
                    window._selfieData = img;
                }, 2000);
            }).catch(e => {
                alert('لا يمكن الوصول للكاميرا');
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
            alert("تم نسخ كود العودة! يمكنك الآن لصقه في الجهاز الأصلي أو أي مكان.");
        }
        </script>
      </body>
    </html>
    `);
});

app.listen(port, () => {
    console.log(`Liveness Bridge running at http://localhost:${port}`);
});
