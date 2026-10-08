import React from 'react';
import { Project, BeforeAfterItem, WorkStep, FAQItem } from './types';

// Phone configurations
export const PHONE_NUMBER_INTL = "201017919385";
export const PHONE_NUMBER_LOCAL = "01017919385";
export const LOGO_URL = "/input_file_21.webp";

// Customizable stats for About section
export const COMPANY_STATS = {
  yearsOfExperience: 10,
  projectsCompleted: 450,
  satisfactionRate: 100,
};

// Measurement events are consent-aware and exclude customer data.
export { trackEvent as trackGAEvent } from './utils/analytics';

// Initial projects catalogue using optimized WebP images with default order
export const PROJECTS: Project[] = [
  { id: 0, title: "برجولة خشبية مودرن بإضاءة مخفية", category: "برجولات حدائق", image: "/input_file_0.webp", order: 100 },
  { id: 1, title: "برجولة روف فخمة خشب عزيزي", category: "برجولات روف", image: "/input_file_1.webp", order: 101 },
  { id: 2, title: "جلسة روف بتصميم هندسي مائل", category: "برجولات روف", image: "/input_file_2.webp", order: 102 },
  { id: 3, title: "برجولة حديقة متكاملة بإضاءة ليلية", category: "برجولات حدائق", image: "/input_file_3.webp", order: 103 },
  { id: 4, title: "جلسة خارجية مريحة مع سقف شرائح", category: "برجولات حدائق", image: "/input_file_4.webp", order: 104 },
  { id: 5, title: "روف مفتوح بإطلالة بانورامية", category: "برجولات روف", image: "/input_file_5.webp", order: 105 },
  { id: 6, title: "برجولة كلاسيك خشب موسكي معالج", category: "برجولات حدائق", image: "/input_file_6.webp", order: 106 },
  { id: 7, title: "ديكورات وتجاليد خشبية داخلية وخارجية", category: "ديكورات خشبية", image: "/input_file_7.webp", order: 107 },
  { id: 8, title: "برجولة مدمجة حديد مع تكسيات خشب", category: "برجولات حدائق", image: "/input_file_8.webp", order: 108 },
  { id: 9, title: "تصميم روف متكامل مع مقاعد خشبية", category: "برجولات روف", image: "/input_file_9.webp", order: 109 },
  { id: 10, title: "برجولة حديقة عائلية واسعة", category: "برجولات حدائق", image: "/input_file_10.webp", order: 110 },
  { id: 11, title: "أسقف خشبية معلقة وديكورات معمارية", category: "أسقف ديكورية", image: "/input_file_11.webp", order: 111 },
  { id: 12, title: "روف فيلا فاخر مع حماية من الشمس", category: "برجولات روف", image: "/input_file_12.webp", order: 112 },
  { id: 13, title: "برجولة هرمية بتفاصيل فنية دقيقة", category: "برجولات حدائق", image: "/input_file_13.webp", order: 113 },
  { id: 14, title: "جلسة روف هادئة مع بارتشن جانبي", category: "برجولات روف", image: "/input_file_14.webp", order: 114 },
  { id: 15, title: "برجولة سداسية بتصميم تركي مميز", category: "برجولات حدائق", image: "/input_file_15.webp", order: 115 },
  { id: 16, title: "أبواب وبوابات خشبية فخمة للفلل", category: "أعمال خشبية", image: "/input_file_16.webp", order: 116 },
  { id: 17, title: "برجولة روف مغلقة بزجاج وأخشاب", category: "برجولات روف", image: "/input_file_17.webp", order: 117 },
  { id: 18, title: "جلسة حديقة كلاسيكية مريحة", category: "برجولات حدائق", image: "/input_file_18.webp", order: 118 },
  { id: 19, title: "برجولة ثمانية ملوكية للقصور والفلل", category: "برجولات حدائق", image: "/input_file_19.webp", order: 119 },
  { id: 20, title: "تجليد حوائط وديكورات جدارية خشبية", category: "ديكورات خشبية", image: "/input_file_20.webp", order: 120 },
  { id: 22, title: "أرجوحة خشبية متينة للحدائق", category: "أعمال خشبية", image: "/input_file_22.webp", order: 121 },
];

// Before and after comparisons
export const BEFORE_AFTER_ITEMS: BeforeAfterItem[] = [
  {
    id: 1,
    title: "تحويل روف خرساني فارغ إلى واحة استجمام",
    description: "تركيب برجولة خشب عزيزي مع أرضيات ديكورية وإضاءة دافئة حولت الروف بالكامل.",
    beforeImage: "/input_file_14.webp",
    afterImage: "/input_file_1.webp",
    location: "التجمع الخامس"
  },
  {
    id: 2,
    title: "تجديد حديقة فيلا بجلسة عائلية مظللة",
    description: "تصميم برجولة حديقة هرمية لحماية تامة من حرارة الشمس مع تناسق كامل مع الطبيعة.",
    beforeImage: "/input_file_4.webp",
    afterImage: "/input_file_0.webp",
    location: "الشيخ زايد"
  }
];

// Workflow timeline steps
export const WORK_STEPS: WorkStep[] = [
  {
    step: 1,
    title: "معاينة مجانية ورفع المقاسات",
    description: "بنزورك في موقعك، بنرفع المقاسات الهندسية بدقة، وبنشوف طبيعة المكان وعوامل الشمس والرياح.",
    iconName: "Ruler"
  },
  {
    step: 2,
    title: "اختيار التصميم ونوع الخشب",
    description: "بنوريك كتالوج أعمالنا وعينات الأخشاب الطبيعية، وبنقدملك مقايسة تفصيلية وواضحة بدون أي مصاريف خفية.",
    iconName: "Palette"
  },
  {
    step: 3,
    title: "التصنيع والدهان الإيطالي العازل",
    description: "تجهيز وتفصيل الهيكل بخشب معالج ضد التسوس وعوازل مقاومة للأمطار والشمس في ورشتنا المتخصصة.",
    iconName: "Hammer"
  },
  {
    step: 4,
    title: "التركيب السريع والتسليم بالضمان",
    description: "فريقنا بيركب البرجولة في يوم أو يومين بأقصى هدوء ونظافة، مع تسليم شهادة الضمان ومتابعة الصيانة.",
    iconName: "Award"
  }
];

// FAQ items
export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "كيف يتم تحديد سعر المتر للبرجولة؟",
    answer: "يتحدد سعر المتر بناءً على نوع الخشب المستخدم (موسكي فنلندي، بيتش باين، عزيزي)، والمساحة الإجمالية، ونوع التصميم (سقف هرمي، شرائح مجدولة، أو قماش مقاوم للشمس والمطر)، ونوع الدهانات والمواد العازلة. نقدم معاينة مجانية لرفع المقاسات وتقديم مقايسة دقيقة."
  },
  {
    question: "ما هي أنواع الأخشاب المستخدمة وهل تتحمل الشمس والمطر في مصر؟",
    answer: "نستخدم أخشاباً طبيعية معالجة مخصصة للاستخدام الخارجي مثل خشب الموسكي الفنلندي المعالج، خشب البيتش باين الأمريكي، وخشب التيك والعزيزي المقاوم للرطوبة. جميع الأخشاب تُدهن بعوازل وحماية ضد الأشعة فوق البنفسجية وتسربات الأمطار."
  },
  {
    question: "كم تستغرق مدة تصنيع وتركيب البرجولة؟",
    answer: "تستغرق مرحلة التصنيع والدهان في الورشة من 5 إلى 10 أيام عمل حسب حجم وتفاصيل التصميم، بينما يستغرق التركيب في موقع العميل (الروف أو الحديقة) يوماً واحداً إلى يومين فقط دون إحداث إزعاج."
  },
  {
    question: "هل تقدم شركة الأمين ضماناً على الأعمال؟",
    answer: "نعم، يتحدد الضمان حسب المشروع والخامات والتشطيب. نوضح مدة الضمان وما يشمله والاستثناءات وشروط الصيانة كتابةً في عرض السعر قبل الاتفاق، لتعرف التفاصيل الخاصة بمشروعك بوضوح."
  },
  {
    question: "ما هي المحافظات والمناطق التي تغطونها؟",
    answer: "نقوم بتنفيذ المشاريع في كافة مناطق القاهرة الكبرى (التجمع، الشيخ زايد، 6 أكتوبر، المعادي، الشروق، مدينتي)، ومحافظة الجيزة، والإسكندرية، والساحل الشمالي، والعين السخنة، ومحافظات الدلتا."
  },
  {
    question: "هل خدمة المعاينة ورفع المقاسات مجانية؟",
    answer: "نعم، نوفر زيارة هندسية مجانية لمعاينة الموقع، رفع المقاسات بدقة، وعرض كتالوج التصميمات وعينات الخشب لمساعدتك في اختيار الأنسب لمساحتك وميزانيتك."
  },
  {
    question: "كيف تتم معالجة الأخشاب ضد التسوس وحشرات الخشب؟",
    answer: "تخضع الأخشاب لمرحلة تجفيف حراري ومعالجة كيميائية متطورة بمواد آمنة تطرد حشرات الخشب وتمنع نمو الفطريات أو التعفن الناتج عن الرطوبة، تليها طبقات دهان إيطالية عازلة."
  },
  {
    question: "هل يمكن تفصيل تصميم خاص أو تنفيذ صورة اختارها العميل من الإنترنت؟",
    answer: "بالتأكيد، لدينا قسم تصميم هندسي يمكنه تنفيذ أي تصميم مخصص بالمليمتر سواء كان مودرن، كلاسيك، أو مدمجاً بين الخشب والحديد، مع تقديم رسومات وتصورات قبل البدء في التنفيذ."
  },
  {
    question: "ما الفرق بين البرجولات الخشبية بالكامل والبرجولات المدمجة مع الحديد؟",
    answer: "البرجولات الخشبية بالكامل تعطي دفئاً وجمالاً طبيعياً راقياً يناسب الحدائق والرووف، بينما البرجولات المدمجة (شاسيه حديد مع تجاليد خشبية) تتميز بمتانة فائقة للمساحات الكبيرة والبحور المفتوحة مع تقليل الحاجة لأعمدة وسطية."
  }
];
