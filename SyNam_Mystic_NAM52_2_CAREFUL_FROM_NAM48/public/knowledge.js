window.MYSTIC_DB = {
  sources: [
    {
      title: "Can Chi / Chu kỳ 60 năm",
      scope: "10 Thiên Can kết hợp 12 Địa Chi thành chu kỳ 60 tổ hợp trong lịch pháp Á Đông.",
      reliability: "Cao với vai trò quy ước lịch pháp truyền thống.",
      appUse: "Tính Can Chi năm sinh, con giáp và lớp diễn giải văn hóa."
    },
    {
      title: "Ngũ hành",
      scope: "Kim, Mộc, Thủy, Hỏa, Thổ cùng quan hệ tương sinh/tương khắc.",
      reliability: "Hệ triết học cổ phương Đông, dùng tham khảo văn hóa.",
      appUse: "Diễn giải tính khí, điểm mạnh, điểm cần cân bằng và hợp tuổi."
    },
    {
      title: "Cung phi Bát trạch",
      scope: "Cung mệnh theo năm sinh và giới tính, chia Đông Tứ Mệnh/Tây Tứ Mệnh.",
      reliability: "Quy ước phong thủy truyền thống.",
      appUse: "Gợi ý hướng khí tham khảo."
    },
    {
      title: "12 cung hoàng đạo",
      scope: "Xác định cung theo ngày sinh dương lịch.",
      reliability: "Phổ biến về văn hóa, không dùng như chứng cứ khoa học.",
      appUse: "Bổ sung lớp diễn giải tính cách phương Tây."
    },
    {
      title: "Tarot Rider–Waite–Smith",
      scope: "Hệ biểu tượng Tarot phổ biến.",
      reliability: "Công cụ suy ngẫm, không dự đoán chắc chắn tương lai.",
      appUse: "Rút bài và viết thông điệp định hướng."
    },
    {
      title: "Palmistry / Chỉ tay",
      scope: "Đường sinh đạo, trí đạo, tâm đạo, định mệnh.",
      reliability: "Tham khảo văn hóa, không chẩn đoán y tế/số phận.",
      appUse: "Upload ảnh, chọn đặc điểm và diễn giải chi tiết."
    },
    {
      title: "Nhân tướng học",
      scope: "Quan sát trán, mắt, mũi, miệng, cằm và phong thái.",
      reliability: "Tham khảo văn hóa, không đánh giá con người tuyệt đối.",
      appUse: "Upload ảnh, chọn vùng quan sát và diễn giải thận trọng."
    }
  ],
  stems: ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"],
  branches: ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"],
  animals: {"Tý":"Chuột","Sửu":"Trâu","Dần":"Hổ","Mão":"Mèo","Thìn":"Rồng","Tỵ":"Rắn","Ngọ":"Ngựa","Mùi":"Dê","Thân":"Khỉ","Dậu":"Gà","Tuất":"Chó","Hợi":"Lợn"},
  stemElements: {"Giáp":"Mộc","Ất":"Mộc","Bính":"Hỏa","Đinh":"Hỏa","Mậu":"Thổ","Kỷ":"Thổ","Canh":"Kim","Tân":"Kim","Nhâm":"Thủy","Quý":"Thủy"},
  branchElements: {"Tý":"Thủy","Sửu":"Thổ","Dần":"Mộc","Mão":"Mộc","Thìn":"Thổ","Tỵ":"Hỏa","Ngọ":"Hỏa","Mùi":"Thổ","Thân":"Kim","Dậu":"Kim","Tuất":"Thổ","Hợi":"Thủy"},
  stemYinYang: {"Giáp":"Dương","Ất":"Âm","Bính":"Dương","Đinh":"Âm","Mậu":"Dương","Kỷ":"Âm","Canh":"Dương","Tân":"Âm","Nhâm":"Dương","Quý":"Âm"},
  branchHours: {
    "Tý":"23:00–01:00","Sửu":"01:00–03:00","Dần":"03:00–05:00","Mão":"05:00–07:00",
    "Thìn":"07:00–09:00","Tỵ":"09:00–11:00","Ngọ":"11:00–13:00","Mùi":"13:00–15:00",
    "Thân":"15:00–17:00","Dậu":"17:00–19:00","Tuất":"19:00–21:00","Hợi":"21:00–23:00"
  },
  elementGenerate: {"Kim":"Thủy","Thủy":"Mộc","Mộc":"Hỏa","Hỏa":"Thổ","Thổ":"Kim"},
  elementControl: {"Kim":"Mộc","Mộc":"Thổ","Thổ":"Thủy","Thủy":"Hỏa","Hỏa":"Kim"},
  napAmByPair: {
    "Giáp Tý":"Hải Trung Kim","Ất Sửu":"Hải Trung Kim",
    "Bính Dần":"Lư Trung Hỏa","Đinh Mão":"Lư Trung Hỏa",
    "Mậu Thìn":"Đại Lâm Mộc","Kỷ Tỵ":"Đại Lâm Mộc",
    "Canh Ngọ":"Lộ Bàng Thổ","Tân Mùi":"Lộ Bàng Thổ",
    "Nhâm Thân":"Kiếm Phong Kim","Quý Dậu":"Kiếm Phong Kim",
    "Giáp Tuất":"Sơn Đầu Hỏa","Ất Hợi":"Sơn Đầu Hỏa",
    "Bính Tý":"Giản Hạ Thủy","Đinh Sửu":"Giản Hạ Thủy",
    "Mậu Dần":"Thành Đầu Thổ","Kỷ Mão":"Thành Đầu Thổ",
    "Canh Thìn":"Bạch Lạp Kim","Tân Tỵ":"Bạch Lạp Kim",
    "Nhâm Ngọ":"Dương Liễu Mộc","Quý Mùi":"Dương Liễu Mộc",
    "Giáp Thân":"Tuyền Trung Thủy","Ất Dậu":"Tuyền Trung Thủy",
    "Bính Tuất":"Ốc Thượng Thổ","Đinh Hợi":"Ốc Thượng Thổ",
    "Mậu Tý":"Tích Lịch Hỏa","Kỷ Sửu":"Tích Lịch Hỏa",
    "Canh Dần":"Tùng Bách Mộc","Tân Mão":"Tùng Bách Mộc",
    "Nhâm Thìn":"Trường Lưu Thủy","Quý Tỵ":"Trường Lưu Thủy",
    "Giáp Ngọ":"Sa Trung Kim","Ất Mùi":"Sa Trung Kim",
    "Bính Thân":"Sơn Hạ Hỏa","Đinh Dậu":"Sơn Hạ Hỏa",
    "Mậu Tuất":"Bình Địa Mộc","Kỷ Hợi":"Bình Địa Mộc",
    "Canh Tý":"Bích Thượng Thổ","Tân Sửu":"Bích Thượng Thổ",
    "Nhâm Dần":"Kim Bạch Kim","Quý Mão":"Kim Bạch Kim",
    "Giáp Thìn":"Phú Đăng Hỏa","Ất Tỵ":"Phú Đăng Hỏa",
    "Bính Ngọ":"Thiên Hà Thủy","Đinh Mùi":"Thiên Hà Thủy",
    "Mậu Thân":"Đại Dịch Thổ","Kỷ Dậu":"Đại Dịch Thổ",
    "Canh Tuất":"Thoa Xuyến Kim","Tân Hợi":"Thoa Xuyến Kim",
    "Nhâm Tý":"Tang Đố Mộc","Quý Sửu":"Tang Đố Mộc",
    "Giáp Dần":"Đại Khê Thủy","Ất Mão":"Đại Khê Thủy",
    "Bính Thìn":"Sa Trung Thổ","Đinh Tỵ":"Sa Trung Thổ",
    "Mậu Ngọ":"Thiên Thượng Hỏa","Kỷ Mùi":"Thiên Thượng Hỏa",
    "Canh Thân":"Thạch Lựu Mộc","Tân Dậu":"Thạch Lựu Mộc",
    "Nhâm Tuất":"Đại Hải Thủy","Quý Hợi":"Đại Hải Thủy"
  },
  napAmMeaning: {
    "Hải Trung Kim": "Vàng trong biển, tượng trưng cho giá trị sâu kín, nội lực tiềm ẩn, cần môi trường đúng để tỏa sáng.",
    "Lư Trung Hỏa": "Lửa trong lò, tượng trưng cho năng lượng được rèn luyện, càng có khuôn phép càng mạnh.",
    "Đại Lâm Mộc": "Cây rừng lớn, tượng trưng cho sức sống, sự bao dung và khả năng phát triển rộng.",
    "Lộ Bàng Thổ": "Đất ven đường, tượng trưng cho nền tảng thực tế, sự chịu đựng và tính phục vụ.",
    "Kiếm Phong Kim": "Kim đầu kiếm, tượng trưng cho sự sắc bén, quyết đoán, năng lực đột phá.",
    "Sơn Đầu Hỏa": "Lửa đầu núi, tượng trưng cho khí thế mạnh, dễ tạo ảnh hưởng nhưng cần kiểm soát.",
    "Giản Hạ Thủy": "Nước khe suối, tượng trưng cho sự tinh tế, nội tâm và khả năng len lỏi.",
    "Thành Đầu Thổ": "Đất thành trì, tượng trưng cho bảo vệ, ổn định và nguyên tắc.",
    "Bạch Lạp Kim": "Kim trong nến trắng, tượng trưng cho giá trị cần được tinh luyện.",
    "Dương Liễu Mộc": "Gỗ cây liễu, tượng trưng cho sự mềm dẻo và thích nghi.",
    "Tuyền Trung Thủy": "Nước trong suối, tượng trưng cho sự trong trẻo, linh hoạt.",
    "Ốc Thượng Thổ": "Đất mái nhà, tượng trưng cho che chở, trách nhiệm và ổn định.",
    "Tích Lịch Hỏa": "Lửa sấm sét, tượng trưng cho sức bật mạnh, biến đổi nhanh.",
    "Tùng Bách Mộc": "Gỗ tùng bách, tượng trưng cho ý chí bền vững.",
    "Trường Lưu Thủy": "Nước sông dài, tượng trưng cho dòng chảy bền bỉ.",
    "Sa Trung Kim": "Vàng trong cát, tượng trưng cho giá trị cần được sàng lọc.",
    "Sơn Hạ Hỏa": "Lửa dưới núi, tượng trưng cho nhiệt năng ẩn, cần thời cơ.",
    "Bình Địa Mộc": "Cây đồng bằng, tượng trưng cho sự gần gũi, phát triển ổn.",
    "Bích Thượng Thổ": "Đất trên vách, tượng trưng cho nguyên tắc và lớp bảo vệ.",
    "Kim Bạch Kim": "Vàng pha bạc, tượng trưng cho sự tinh khiết, rõ ràng.",
    "Phú Đăng Hỏa": "Lửa đèn, tượng trưng cho ánh sáng tri thức.",
    "Thiên Hà Thủy": "Nước trên trời, tượng trưng cho cảm hứng và sự thanh lọc.",
    "Đại Dịch Thổ": "Đất vùng rộng, tượng trưng cho bao dung và chuyển hóa.",
    "Thoa Xuyến Kim": "Vàng trang sức, tượng trưng cho vẻ đẹp tinh luyện.",
    "Tang Đố Mộc": "Gỗ cây dâu, tượng trưng cho tính hữu dụng và chăm lo.",
    "Đại Khê Thủy": "Nước khe lớn, tượng trưng cho dòng chảy mạnh.",
    "Sa Trung Thổ": "Đất pha cát, tượng trưng cho sự linh hoạt trong nền tảng.",
    "Thiên Thượng Hỏa": "Lửa trên trời, tượng trưng cho ánh sáng lớn, lý tưởng.",
    "Thạch Lựu Mộc": "Gỗ cây lựu đá, tượng trưng cho sức sống bền bỉ.",
    "Đại Hải Thủy": "Nước biển lớn, tượng trưng cho tầm vóc, bao la và biến động."
  },
  elements: {
    "Kim": {
      summary: "Kim tượng trưng cho sự cô đọng, nguyên tắc, sắc bén và khả năng tổ chức.",
      strengths: ["quyết đoán", "rõ ràng", "biết đặt tiêu chuẩn", "kỷ luật", "xử lý việc theo logic"],
      risks: ["dễ cứng nhắc", "khó linh hoạt khi cảm xúc người khác thay đổi", "đôi khi quá cầu toàn"],
      career: "Hợp việc cần quy trình, quản lý chất lượng, tài chính, kỹ thuật, pháp lý, vận hành, kiểm soát rủi ro.",
      relationship: "Trong quan hệ, Kim cần học cách mềm lời hơn, lắng nghe cảm xúc trước khi đưa ra kết luận.",
      balance: "Bổ sung yếu tố Thủy/Mộc: giao tiếp mềm mại, sáng tạo và cho phép thử nghiệm."
    },
    "Mộc": {
      summary: "Mộc tượng trưng cho sinh trưởng, mở rộng, học hỏi và khả năng thích nghi.",
      strengths: ["sáng tạo", "dễ phát triển ý tưởng", "thích học", "biết kết nối", "có sức bật"],
      risks: ["dễ ôm đồm", "thiếu kiên trì nếu mục tiêu mơ hồ", "có thể lan man"],
      career: "Hợp sáng tạo nội dung, giáo dục, kinh doanh phát triển, marketing, thiết kế, công việc cần tăng trưởng.",
      relationship: "Mộc cần không gian phát triển nhưng cũng nên cam kết rõ ràng để người khác yên tâm.",
      balance: "Bổ sung yếu tố Kim/Thổ: kế hoạch, giới hạn và thói quen ổn định."
    },
    "Thủy": {
      summary: "Thủy tượng trưng cho dòng chảy, giao tiếp, trực giác và khả năng biến đổi.",
      strengths: ["linh hoạt", "nhạy bén", "giao tiếp tốt", "biết quan sát", "có chiều sâu"],
      risks: ["dễ dao động", "ngại đối đầu", "dễ bị môi trường ảnh hưởng"],
      career: "Hợp tư vấn, truyền thông, dịch vụ khách hàng, nghiên cứu, ngoại ngữ, thương mại, công việc cần thích nghi.",
      relationship: "Thủy có khả năng thấu hiểu tốt nhưng cần nói thẳng nhu cầu thay vì giữ trong lòng.",
      balance: "Bổ sung yếu tố Thổ/Hỏa: ổn định, hành động và quyết định dứt khoát."
    },
    "Hỏa": {
      summary: "Hỏa tượng trưng cho nhiệt huyết, ánh sáng, hành động và khả năng truyền cảm hứng.",
      strengths: ["nhiệt tình", "dám làm", "truyền năng lượng", "ra quyết định nhanh", "tạo động lực"],
      risks: ["dễ nóng vội", "dễ chán nếu thiếu phản hồi", "có thể phản ứng cảm tính"],
      career: "Hợp bán hàng, truyền thông, biểu diễn, lãnh đạo nhóm, đào tạo, khởi nghiệp, công việc cần sự hiện diện.",
      relationship: "Hỏa yêu nhanh, thương rõ, nhưng cần học cách chậm lại để nghe người kia.",
      balance: "Bổ sung yếu tố Thủy/Kim: bình tĩnh, cấu trúc và suy xét trước khi hành động."
    },
    "Thổ": {
      summary: "Thổ tượng trưng cho nền tảng, ổn định, nuôi dưỡng và sức bền.",
      strengths: ["đáng tin", "kiên trì", "thực tế", "biết chăm lo", "giữ nhịp ổn định"],
      risks: ["dễ bảo thủ", "ngại thay đổi", "có thể chịu đựng quá lâu"],
      career: "Hợp quản trị, hành chính, bất động sản, nông nghiệp, kế toán, hậu cần, nhân sự, việc cần sự bền bỉ.",
      relationship: "Thổ coi trọng an toàn và trách nhiệm, nên cần người biết trân trọng sự ổn định.",
      balance: "Bổ sung yếu tố Mộc/Hỏa: đổi mới, động lực, niềm vui và sự linh hoạt."
    }
  },
  zodiac: [
    ["Bạch Dương","03-21","04-19","khởi xướng, nhanh, trực diện, thích thử thách","cần học kiên nhẫn và nghe hết câu chuyện"],
    ["Kim Ngưu","04-20","05-20","bền bỉ, thực tế, yêu sự ổn định","cần tránh cố chấp khi hoàn cảnh thay đổi"],
    ["Song Tử","05-21","06-20","linh hoạt, tò mò, giao tiếp nhanh","cần tránh phân tán quá nhiều hướng"],
    ["Cự Giải","06-21","07-22","tình cảm, bảo vệ, trực giác tốt","cần tránh ôm cảm xúc một mình"],
    ["Sư Tử","07-23","08-22","tự tin, hào phóng, thích tỏa sáng","cần tránh cái tôi lấn át người khác"],
    ["Xử Nữ","08-23","09-22","tỉ mỉ, phân tích, thích cải thiện","cần tránh quá khắt khe với bản thân"],
    ["Thiên Bình","09-23","10-22","cân bằng, thẩm mỹ, coi trọng quan hệ","cần tránh do dự vì muốn vừa lòng tất cả"],
    ["Bọ Cạp","10-23","11-21","sâu sắc, mạnh mẽ, kín đáo","cần tránh kiểm soát quá mức"],
    ["Nhân Mã","11-22","12-21","tự do, lạc quan, thích khám phá","cần tránh hứa nhanh rồi đổi hướng"],
    ["Ma Kết","12-22","01-19","kỷ luật, tham vọng, thực tế","cần tránh đặt áp lực quá cao"],
    ["Bảo Bình","01-20","02-18","độc lập, sáng tạo, thích ý tưởng mới","cần tránh quá xa cách cảm xúc"],
    ["Song Ngư","02-19","03-20","nhạy cảm, mơ mộng, giàu lòng trắc ẩn","cần tránh lý tưởng hóa quá mức"]
  ],
  palm: {
    "Sinh đạo": {
      meaning: "Sinh đạo thường dùng để quan sát nhịp sống, sức bền biểu tượng và cách duy trì năng lượng.",
      clear: "Đường rõ thường được diễn giải là nhịp sống tương đối ổn định, dễ tạo thói quen.",
      faint: "Đường mờ thường gợi ý cần chú ý nghỉ ngơi và phân bổ năng lượng.",
      questions: ["Bạn có ngủ nghỉ đều không?", "Bạn có dễ bị cuốn vào việc rồi quên chăm sóc bản thân không?", "Bạn có duy trì vận động hoặc lịch sinh hoạt ổn định không?"]
    },
    "Trí đạo": {
      meaning: "Trí đạo thường liên hệ với lối tư duy, cách học, cách quyết định và khả năng tập trung.",
      clear: "Đường rõ thường gợi ý khả năng suy nghĩ mạch lạc, có xu hướng phân tích vấn đề rõ ràng.",
      faint: "Đường mờ thường được diễn giải là cần rèn sự tập trung, ghi chép và chia nhỏ mục tiêu.",
      questions: ["Bạn ra quyết định bằng lý trí hay cảm xúc nhiều hơn?", "Bạn có dễ mất tập trung không?", "Bạn học tốt hơn bằng hình ảnh, chữ viết hay thực hành?"]
    },
    "Tâm đạo": {
      meaning: "Tâm đạo thường gắn với cảm xúc, cách thể hiện tình cảm và nhu cầu trong quan hệ.",
      clear: "Đường rõ thường được diễn giải là cảm xúc khá rõ ràng, biết mình cần gì trong quan hệ.",
      faint: "Đường mờ thường gợi ý nên học cách gọi tên cảm xúc và giao tiếp nhu cầu.",
      questions: ["Bạn có dễ nói ra cảm xúc thật không?", "Bạn cần sự an toàn hay sự tự do nhiều hơn?", "Bạn thường yêu bằng hành động hay lời nói?"]
    },
    "Định mệnh": {
      meaning: "Đường định mệnh thường được xem như biểu tượng về hướng đi, sự nghiệp và các bước ngoặt.",
      clear: "Đường rõ thường được diễn giải là có mục tiêu hoặc cảm nhận về hướng đi khá rõ.",
      faint: "Đường mờ thường gợi ý con đường nghề nghiệp có thể linh hoạt, thay đổi theo giai đoạn.",
      questions: ["Bạn đang có mục tiêu dài hạn rõ chưa?", "Bạn thích ổn định hay thử nhiều hướng?", "Giai đoạn này điều gì đang kéo bạn thay đổi?"]
    }
  },
  face: {
    "Trán": {
      meaning: "Trán thường được liên hệ với tư duy, tầm nhìn và cách lập kế hoạch.",
      detail: "Trán rộng/cao thường được nói là thiên về suy nghĩ xa và học hỏi, nhưng không dùng để kết luận trí tuệ.",
      safe: "Không đánh giá năng lực thật của ai chỉ từ trán."
    },
    "Mắt": {
      meaning: "Mắt thường được xem là vùng biểu hiện tinh thần, sự tập trung và trạng thái cảm xúc.",
      detail: "Ánh mắt rõ, tập trung thường tạo cảm giác quyết tâm; ánh mắt mệt có thể chỉ do ánh sáng, giấc ngủ hoặc ảnh chụp.",
      safe: "Không suy đoán sức khỏe/tâm lý chắc chắn từ mắt."
    },
    "Mũi": {
      meaning: "Mũi thường được liên hệ với sự quyết đoán, tài vận biểu tượng và khí chất.",
      detail: "Cách diễn giải nên tập trung vào ấn tượng phong thái, không kết luận giàu nghèo hay vận mệnh.",
      safe: "Không phán tài sản, bệnh tật hoặc nhân phẩm từ hình mũi."
    },
    "Miệng": {
      meaning: "Miệng thường gắn với giao tiếp, biểu đạt và quan hệ xã hội.",
      detail: "Nụ cười, độ mở miệng, biểu cảm có thể ảnh hưởng đến cảm nhận của người đối diện, nhưng còn phụ thuộc bối cảnh ảnh.",
      safe: "Không kết luận tính cách chắc chắn chỉ từ một ảnh."
    },
    "Cằm": {
      meaning: "Cằm thường liên hệ với sức bền, sự ổn định và hậu vận trong quan niệm truyền thống.",
      detail: "Cằm rõ nét thường tạo cảm giác kiên định, nhưng đây là ấn tượng văn hóa, không phải dữ liệu đo lường nhân cách.",
      safe: "Không dùng để phân loại giá trị con người."
    }
  },
  tarot: [
    ["The Fool","Khởi đầu mới, tự do, dám bước vào vùng chưa biết.","Bạn có thể đang đứng trước cơ hội mới. Lá này không bảo bạn liều, mà nhắc rằng muốn đổi đời sống thì phải dám bắt đầu. Hãy kiểm tra rủi ro, chuẩn bị tối thiểu, rồi bước một bước nhỏ."],
    ["The Magician","Biến ý tưởng thành hành động, tận dụng công cụ đang có.","Bạn đang có nhiều nguồn lực hơn bạn nghĩ: kỹ năng, mối quan hệ, thiết bị, thời gian nhỏ lẻ. Vấn đề là gom chúng thành một kế hoạch rõ."],
    ["The High Priestess","Trực giác, quan sát, giữ bí mật đúng lúc.","Có chuyện chưa nên vội nói hết. Hãy quan sát tín hiệu nhỏ, kiểm tra cảm giác bên trong và đừng ra quyết định khi thông tin còn thiếu."],
    ["The Empress","Nuôi dưỡng, sáng tạo, phát triển giá trị.","Lá này thiên về chăm sóc nền tảng: sức khỏe, mối quan hệ, ý tưởng, sản phẩm. Thứ tốt cần thời gian được nuôi lớn."],
    ["The Emperor","Kỷ luật, cấu trúc, quyền hạn, kế hoạch.","Bạn cần khung làm việc rõ hơn. Không chỉ cảm hứng, mà phải có lịch, quy trình, giới hạn và tiêu chuẩn."],
    ["The Lovers","Lựa chọn, kết nối, trung thực với điều mình muốn.","Đừng chỉ hỏi người kia muốn gì. Hãy hỏi mình thật sự chọn điều gì, vì lá này nói về giá trị và cam kết."],
    ["The Chariot","Ý chí, tiến lên, kiểm soát hướng đi.","Nếu đang phân tán, hãy chọn một hướng chính. Lá này tốt cho hành động có mục tiêu, không tốt cho chạy theo cảm xúc nhất thời."],
    ["Strength","Sức mạnh mềm, kiên nhẫn, điều phục cảm xúc.","Không phải thắng bằng gồng. Thắng bằng cách bình tĩnh, bền bỉ và biết điều chỉnh phản ứng của mình."],
    ["The Hermit","Lùi lại để soi sáng bên trong.","Có lúc càng hỏi nhiều người càng rối. Lá này khuyên dành thời gian một mình để biết câu trả lời thật nằm ở đâu."],
    ["Wheel of Fortune","Chu kỳ thay đổi, cơ hội và biến động.","Không phải mọi thứ đều nằm trong kiểm soát. Nhưng bạn có thể chuẩn bị để khi cơ hội xuất hiện thì nắm được."]
  ]
};