function FAQs() {
  const faqs = [
    {
      question: "How do credits work?",
      answer:
        "Each creation, whether from a screenshot or text, consumes 1 credit. Every additional edit also consumes 1 credit. If you run out of credits, you can easily upgrade your plan to obtain more.",
    },
    {
      question: "When do credits reset?",
      answer:
        "Your credits reset at the beginning of each month and do not roll over. Every month, on the 1st, you will receive a fresh batch of credits.",
    },
    {
      question: "Can I cancel my plan?",
      answer:
        "Yes, you can cancel your plan at any time. Your plan will remain active until the end of the billing cycle.",
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer:
        "Yes, you can change your plan at any time. The changes will take effect immediately.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards, Alipay, Amazon Pay and Cash App Pay. Certain payment methods may not be available in your country.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">
        Frequently Asked Questions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
            <p className="text-gray-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQs;
