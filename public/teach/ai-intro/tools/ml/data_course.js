// 课件第 3 讲用到的小数据，与工具脚本/deck_ml.py 一致
// 列名和取值以中文作为内部标识（保存文件、参数都用中文），英文界面只在显示时用 ML_EN 翻译
(function () {
  function col(n, t, role) { return { name: n, type: t, role: role }; }
  var melonCols = [col('甜度', 'num', 'f'), col('清脆度', 'num', 'f'), col('类别', 'cat', 'y')];
  window.COURSE_DATA = {
    melon_train: {
      title: '西瓜-训练集', titleEn: 'Melon (training)',
      desc: '课件讲过拟合用的 16 个瓜，其中 2 个标错了',
      descEn: 'The 16 melons from the overfitting slides, 2 of them mislabeled',
      cols: melonCols,
      rows: [
        [1.0, 1.2, 'A类'], [1.5, 2.0, 'A类'], [2.0, 1.0, 'A类'], [2.2, 2.4, 'A类'],
        [1.2, 3.0, 'A类'], [2.8, 1.6, 'A类'], [3.0, 2.8, 'A类'], [1.8, 1.8, 'A类'],
        [6.0, 6.2, 'B类'], [6.5, 5.0, 'B类'], [7.0, 6.8, 'B类'], [5.5, 5.8, 'B类'],
        [7.2, 5.4, 'B类'], [6.8, 7.0, 'B类'],
        [6.2, 6.6, 'A类'],
        [2.5, 2.2, 'B类']
      ]
    },
    melon_test: {
      title: '西瓜-测试集', titleEn: 'Melon (test)',
      desc: '另外 8 个瓜，用来检验模型',
      descEn: '8 other melons for checking the model',
      cols: melonCols,
      rows: [
        [1.4, 1.6, 'A类'], [1.9, 2.6, 'A类'], [2.9, 1.2, 'A类'], [2.4, 2.3, 'A类'],
        [6.3, 5.6, 'B类'], [7.1, 6.2, 'B类'], [6.6, 5.2, 'B类'], [6.1, 6.5, 'B类']
      ]
    },
    loan: {
      title: '银行贷款审批', titleEn: 'Bank loan approval',
      desc: '课件讲决策树用的 14 条申请记录',
      descEn: 'The 14 loan applications from the decision-tree slides',
      cols: [col('年龄', 'cat', 'f'), col('流水', 'cat', 'f'), col('婚否', 'cat', 'f'), col('房产', 'cat', 'f'), col('放贷', 'cat', 'y')],
      rows: [
        ['20-30', '高', '否', '否', '是'], ['20-30', '中', '是', '是', '是'],
        ['20-30', '低', '否', '否', '是'], ['20-30', '中', '否', '是', '是'],
        ['20-30', '低', '是', '否', '是'], ['>30', '高', '是', '是', '是'],
        ['>30', '中', '是', '否', '是'], ['>30', '低', '是', '是', '是'],
        ['>30', '高', '否', '是', '否'], ['>30', '低', '否', '否', '否'],
        ['<20', '中', '否', '是', '是'], ['<20', '高', '否', '否', '否'],
        ['<20', '低', '否', '否', '否'], ['<20', '中', '是', '否', '否']
      ]
    }
  };
  window.ML_EN = Object.assign(window.ML_EN || {}, {
    // 列名
    '甜度': 'sweetness', '清脆度': 'crispness', '类别': 'class',
    '年龄': 'Age', '流水': 'Income', '婚否': 'Married', '房产': 'Owns home', '放贷': 'Loan approved',
    // 取值
    'A类': 'class A', 'B类': 'class B', '高': 'high', '中': 'medium', '低': 'low', '是': 'yes', '否': 'no',
    // 示例工作流里给文件组件起的名字
    '西瓜-训练集': 'Melon (training)', '西瓜-测试集': 'Melon (test)'
  });
})();
