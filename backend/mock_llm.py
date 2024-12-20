import asyncio
from typing import Awaitable, Callable

from custom_types import InputMode
from llm import Completion


STREAM_CHUNK_SIZE = 20


async def mock_completion(
    process_chunk: Callable[[str, int], Awaitable[None]], input_mode: InputMode
) -> Completion:
    code_to_return = (
        TALLY_FORM_VIDEO_PROMPT_MOCK
        if input_mode == "video"
        else NO_IMAGES_NYTIMES_MOCK_CODE
    )

    for i in range(0, len(code_to_return), STREAM_CHUNK_SIZE):
        await process_chunk(code_to_return[i : i + STREAM_CHUNK_SIZE], i)
        await asyncio.sleep(0.01)

    if input_mode == "video":
        # Extract the last <html></html> block from code_to_return
        # because we can have multiple passes
        start = code_to_return.rfind("<html")
        end = code_to_return.rfind("</html>") + len("</html>")
        if start != -1 and end != -1:
            code_to_return = code_to_return[start:end]
        else:
            code_to_return = "Error: HTML block not found."

    return {"duration": 0.1, "code": code_to_return}


APPLE_MOCK_CODE = """<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Showcase</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
        }
    </style>
</head>
<body class="bg-black text-white">
    <nav class="py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div class="flex items-center">
                <img src="https://placehold.co/24x24" alt="Company Logo" class="mr-8">
                <a href="#" class="text-white text-sm font-medium mr-4">Store</a>
                <a href="#" class="text-white text-sm font-medium mr-4">Mac</a>
                <a href="#" class="text-white text-sm font-medium mr-4">iPad</a>
                <a href="#" class="text-white text-sm font-medium mr-4">iPhone</a>
                <a href="#" class="text-white text-sm font-medium mr-4">Watch</a>
                <a href="#" class="text-white text-sm font-medium mr-4">Vision</a>
                <a href="#" class="text-white text-sm font-medium mr-4">AirPods</a>
                <a href="#" class="text-white text-sm font-medium mr-4">TV & Home</a>
                <a href="#" class="text-white text-sm font-medium mr-4">Entertainment</a>
                <a href="#" class="text-white text-sm font-medium mr-4">Accessories</a>
                <a href="#" class="text-white text-sm font-medium">Support</a>
            </div>
            <div class="flex items-center">
                <a href="#" class="text-white text-sm font-medium mr-4"><i class="fas fa-search"></i></a>
                <a href="#" class="text-white text-sm font-medium"><i class="fas fa-shopping-bag"></i></a>
            </div>
        </div>
    </nav>

    <main class="mt-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <img src="https://placehold.co/100x100" alt="Brand Logo" class="mx-auto mb-4">
                <h1 class="text-5xl font-bold mb-4">WATCH SERIES 9</h1>
                <p class="text-2xl font-medium mb-8">Smarter. Brighter. Mightier.</p>
                <div class="flex justify-center space-x-4">
                    <a href="#" class="text-blue-600 text-sm font-medium">Learn more ></a>
                    <a href="#" class="text-blue-600 text-sm font-medium">Buy ></a>
                </div>
            </div>
            <div class="flex justify-center mt-12">
                <img src="https://placehold.co/500x300" alt="Product image of a smartwatch with a pink band and a circular interface displaying various health metrics." class="mr-8">
                <img src="https://placehold.co/500x300" alt="Product image of a smartwatch with a blue band and a square interface showing a classic analog clock face." class="ml-8">
            </div>
        </div>
    </main>
</body>
</html>"""

NYTIMES_MOCK_CODE = """
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The New York Times - News</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    <style>
        body {
            font-family: 'Libre Franklin', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4">
        <header class="border-b border-gray-300 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <button class="text-gray-700"><i class="fas fa-bars"></i></button>
                    <button class="text-gray-700"><i class="fas fa-search"></i></button>
                    <div class="text-xs uppercase tracking-widest">Tuesday, November 14, 2023<br>Today's Paper</div>
                </div>
                <div>
                    <img src="https://placehold.co/200x50?text=The+New+York+Times+Logo" alt="The New York Times Logo" class="h-8">
                </div>
                <div class="flex items-center space-x-4">
                    <button class="bg-black text-white px-4 py-1 text-xs uppercase tracking-widest">Give the times</button>
                    <div class="text-xs">Account</div>
                </div>
            </div>
            <nav class="flex justify-between items-center py-4">
                <div class="flex space-x-4">
                    <a href="#" class="text-xs uppercase tracking-widest text-gray-700">U.S.</a>
                    <!-- Add other navigation links as needed -->
                </div>
                <div class="flex space-x-4">
                    <a href="#" class="text-xs uppercase tracking-widest text-gray-700">Cooking</a>
                    <!-- Add other navigation links as needed -->
                </div>
            </nav>
        </header>
        <main>
            <section class="py-6">
                <div class="grid grid-cols-3 gap-4">
                    <div class="col-span-2">
                        <article class="mb-4">
                            <h2 class="text-xl font-bold mb-2">Israeli Military Raids Gaza's Largest Hospital</h2>
                            <p class="text-gray-700 mb-2">Israeli troops have entered the Al-Shifa Hospital complex, where conditions have grown dire and Israel says Hamas fighters are embedded.</p>
                            <a href="#" class="text-blue-600 text-sm">See more updates <i class="fas fa-external-link-alt"></i></a>
                        </article>
                        <!-- Repeat for each news item -->
                    </div>
                    <div class="col-span-1">
                        <article class="mb-4">
                            <img src="https://placehold.co/300x200?text=News+Image" alt="Flares and plumes of smoke over the northern Gaza skyline on Tuesday." class="mb-2">
                            <h2 class="text-xl font-bold mb-2">From Elvis to Elopements, the Evolution of the Las Vegas Wedding</h2>
                            <p class="text-gray-700 mb-2">The glittering city that attracts thousands of couples seeking unconventional nuptials has grown beyond the drive-through wedding.</p>
                            <a href="#" class="text-blue-600 text-sm">8 MIN READ</a>
                        </article>
                        <!-- Repeat for each news item -->
                    </div>
                </div>
            </section>
        </main>
    </div>
</body>
</html>
"""

NO_IMAGES_NYTIMES_MOCK_CODE = """
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The New York Times - News</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    <style>
        body {
            font-family: 'Libre Franklin', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4">
        <header class="border-b border-gray-300 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <button class="text-gray-700"><i class="fas fa-bars"></i></button>
                    <button class="text-gray-700"><i class="fas fa-search"></i></button>
                    <div class="text-xs uppercase tracking-widest">Tuesday, November 14, 2023<br>Today's Paper</div>
                </div>
                <div class="flex items-center space-x-4">
                    <button class="bg-black text-white px-4 py-1 text-xs uppercase tracking-widest">Give the times</button>
                    <div class="text-xs">Account</div>
                </div>
            </div>
            <nav class="flex justify-between items-center py-4">
                <div class="flex space-x-4">
                    <a href="#" class="text-xs uppercase tracking-widest text-gray-700">U.S.</a>
                    <!-- Add other navigation links as needed -->
                </div>
                <div class="flex space-x-4">
                    <a href="#" class="text-xs uppercase tracking-widest text-gray-700">Cooking</a>
                    <!-- Add other navigation links as needed -->
                </div>
            </nav>
        </header>
        <main>
            <section class="py-6">
                <div class="grid grid-cols-3 gap-4">
                    <div class="col-span-2">
                        <article class="mb-4">
                            <h2 class="text-xl font-bold mb-2">Israeli Military Raids Gaza's Largest Hospital</h2>
                            <p class="text-gray-700 mb-2">Israeli troops have entered the Al-Shifa Hospital complex, where conditions have grown dire and Israel says Hamas fighters are embedded.</p>
                            <a href="#" class="text-blue-600 text-sm">See more updates <i class="fas fa-external-link-alt"></i></a>
                        </article>
                        <!-- Repeat for each news item -->
                    </div>
                    <div class="col-span-1">
                        <article class="mb-4">
                            <h2 class="text-xl font-bold mb-2">From Elvis to Elopements, the Evolution of the Las Vegas Wedding</h2>
                            <p class="text-gray-700 mb-2">The glittering city that attracts thousands of couples seeking unconventional nuptials has grown beyond the drive-through wedding.</p>
                            <a href="#" class="text-blue-600 text-sm">8 MIN READ</a>
                        </article>
                        <!-- Repeat for each news item -->
                    </div>
                </div>
            </section>
        </main>
    </div>
</body>
</html>
"""

MORTGAGE_CALCULATOR_VIDEO_PROMPT_MOCK = """
<thinking>
The user flow in the video seems to be:
1. The calculator starts with some default values for loan amount, loan term, interest rate, etc. 
2. The user toggles the "Include taxes & fees" checkbox which shows an explanation tooltip.
3. The user selects different loan terms from the dropdown, which updates the monthly payment amount.
4. The user enters a custom loan amount.
5. The user selects a different loan term (30-yr fixed FHA).
6. The user enters additional details like home price, down payment, state, credit score, property tax, home insurance, and HOA fees.
7. The calculator updates the total monthly payment breakdown.

To build this:
- Use a container div for the whole calculator
- Have sections for Monthly Payment, Purchase Budget, loan details, additional costs
- Use input fields, dropdowns, and checkboxes for user input
- Update values dynamically using JavaScript when inputs change
- Show/hide explanation tooltip when checkbox is toggled
- Update monthly payment whenever loan amount, interest rate or term is changed
- Allow selecting loan term from a dropdown 
- Update total monthly payment breakdown as additional costs are entered
- Style everything to match the screenshots using Tailwind utility classes
</thinking>

<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
</head>
<body>
<div class="max-w-lg mx-auto bg-white shadow-lg rounded-lg p-6 font-sans">
  <div class="text-2xl font-semibold mb-6">Mortgage Calculator</div>
  
  <div class="flex justify-between text-sm uppercase font-semibold text-gray-500 border-b mb-4">
    <div class="pb-2 border-b-2 border-blue-500">Monthly payment</div>
    <div class="pb-2">Purchase budget</div>
  </div>

  <div class="flex items-center mb-4">
    <input type="checkbox" class="mr-2 taxes-toggle" id="taxesToggle">
    <label for="taxesToggle" class="text-sm">Include taxes & fees</label>
    <i class="fas fa-info-circle ml-1 text-gray-400 cursor-pointer" id="taxesInfo"></i>
    <div class="hidden bg-gray-100 text-xs p-2 ml-2 rounded" id="taxesTooltip">Your total monthly payment is more than just your mortgage. It can include property taxes, homeowners insurance, and HOA fees, among other things.</div>
  </div>

  <div class="text-3xl font-semibold mb-4">$<span id="monthlyPayment">1,696</span></div>

  <div class="mb-4">
    <div class="text-sm font-semibold mb-2">Loan amount</div>
    <input type="text" value="240,000" class="w-full border rounded px-2 py-1 text-lg" id="loanAmount">
  </div>

  <div class="mb-4">
    <div class="text-sm font-semibold mb-2">Loan term</div>
    <select class="w-full border rounded px-2 py-1 text-lg" id="loanTerm">
      <option>30-yr fixed</option>
      <option>30-yr fixed FHA</option>
      <option>30-yr fixed VA</option>
      <option>30-yr fixed USDA</option>
      <option>20-yr fixed</option>
      <option>15-yr fixed</option>
      <option>10 / 6 ARM</option>
      <option>7 / 6 ARM</option>
      <option>5 / 6 ARM</option>
      <option>3 / 6 ARM</option>
    </select>
  </div>

  <div class="flex justify-between mb-4">
    <div>
      <div class="text-sm font-semibold mb-2">Interest</div>
      <div class="text-lg">7.61 %</div>
    </div>
    <i class="fas fa-info-circle text-gray-400 cursor-pointer self-center"></i>
  </div>

  <div class="border-t pt-4">
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Home price</div>
      <input type="text" value="300,000" class="w-full border rounded px-2 py-1 text-lg" id="homePrice">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Down payment</div>
      <div class="flex">
        <input type="text" value="60,000" class="w-full border rounded-l px-2 py-1 text-lg" id="downPayment">
        <div class="bg-gray-200 rounded-r px-4 py-1 text-lg flex items-center">20 %</div>
      </div>
    </div>
  </div>

  <div class="border-t pt-4">
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">State</div>
      <select class="w-full border rounded px-2 py-1 text-lg" id="state">
        <option>New York</option>
      </select>
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Credit score</div>
      <select class="w-full border rounded px-2 py-1 text-lg" id="creditScore">
        <option>700 - 719</option>
      </select>
    </div>
  </div>

  <div class="border-t pt-4">
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Property tax (yearly)</div>
      <input type="text" value="3,750" class="w-full border rounded px-2 py-1 text-lg" id="propertyTax">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Home insurance (yearly)</div>
      <input type="text" value="1,050" class="w-full border rounded px-2 py-1 text-lg" id="homeInsurance">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Private mortgage insurance (monthly)</div>
      <input type="text" value="0" class="w-full border rounded px-2 py-1 text-lg" id="mortgageInsurance">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Homeowners association (monthly)</div>
      <input type="text" value="0" class="w-full border rounded px-2 py-1 text-lg" id="hoaFees">
    </div>
  </div>

  <div class="flex justify-between pt-4">
    <div class="text-sm">
      <div class="font-semibold">Total monthly payment</div>
      <div class="text-3xl font-semibold">$<span id="totalPayment">2,036</span></div>
    </div>
    <div class="text-right">
      <div class="text-sm">Loan</div>
      <div class="text-lg">$<span id="loanPayment">1,635</span></div>
      <div class="text-sm">Taxes & fees</div>
      <div>$<span id="taxesPayment">401</span></div>
    </div>
  </div>

  <div class="text-xs text-gray-500 mt-4">
    <div>Disclaimer • Feedback</div>
  </div>
</div>

<script>
$(document).ready(function() {
  var loanAmount = 240000;
  var interestRate = 7.61;
  var loanTerm = 30;
  var homePrice = 300000;
  var downPayment = 60000;
  var propertyTax = 3750;
  var homeInsurance = 1050;
  var mortgageInsurance = 0;
  var hoaFees = 0;

  function updateCalculations() {
    var principal = loanAmount;
    var monthlyInterest = interestRate / 100 / 12;
    var numPayments = loanTerm * 12;
    var monthlyPayment = principal * monthlyInterest / (1 - (Math.pow(1/(1 + monthlyInterest), numPayments)));
    var totalPayment = monthlyPayment;
    var taxesPayment = (propertyTax + homeInsurance) / 12;

    if ($('#taxesToggle').is(':checked')) {
      totalPayment += taxesPayment + mortgageInsurance + hoaFees;
    }

    $('#monthlyPayment').text(Math.round(monthlyPayment).toLocaleString());
    $('#loanPayment').text(Math.round(monthlyPayment).toLocaleString());
    $('#taxesPayment').text(Math.round(taxesPayment + mortgageInsurance + hoaFees).toLocaleString());
    $('#totalPayment').text(Math.round(totalPayment).toLocaleString());
  }

  $('#taxesInfo').hover(function() {
    $('#taxesTooltip').removeClass('hidden');
  }, function() {
    $('#taxesTooltip').addClass('hidden');
  });

  $('#loanTerm').change(function() {
    loanTerm = parseInt($(this).val().split('-')[0]);
    updateCalculations();
  });

  $('#loanAmount').change(function() {
    loanAmount = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#homePrice').change(function() {
    homePrice = parseInt($(this).val().replace(/,/g, ''));
    loanAmount = homePrice - downPayment;
    $('#loanAmount').val(loanAmount.toLocaleString());
    updateCalculations();
  });

  $('#downPayment').change(function() {
    downPayment = parseInt($(this).val().replace(/,/g, ''));
    loanAmount = homePrice - downPayment;
    $('#loanAmount').val(loanAmount.toLocaleString());
    updateCalculations();
  });

  $('#propertyTax').change(function() {
    propertyTax = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#homeInsurance').change(function() {
    homeInsurance = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#mortgageInsurance').change(function() {
    mortgageInsurance = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#hoaFees').change(function() {
    hoaFees = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  updateCalculations();
});
</script>
</body>
</html>

<thinking>
More things to consider:
- Add validation to input fields to prevent non-numeric values
- Add a reset button to clear all inputs and reset to default values
</thinking>

<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
</head>
<body>
<div class="max-w-lg mx-auto bg-black text-white shadow-lg rounded-lg p-6 font-sans">
  <div class="text-2xl font-semibold mb-6">Mortgage Calculator</div>
  
  <div class="flex justify-between text-sm uppercase font-semibold text-gray-500 border-b mb-4">
    <div class="pb-2 border-b-2 border-blue-500">Monthly payment</div>
    <div class="pb-2">Purchase budget</div>
  </div>

  <div class="flex items-center mb-4">
    <input type="checkbox" class="mr-2 taxes-toggle" id="taxesToggle">
    <label for="taxesToggle" class="text-sm">Include taxes & fees</label>
    <i class="fas fa-info-circle ml-1 text-gray-400 cursor-pointer" id="taxesInfo"></i>
    <div class="hidden bg-gray-100 text-xs p-2 ml-2 rounded" id="taxesTooltip">Your total monthly payment is more than just your mortgage. It can include property taxes, homeowners insurance, and HOA fees, among other things.</div>
  </div>

  <div class="text-3xl font-semibold mb-4">$<span id="monthlyPayment">1,696</span></div>

  <div class="mb-4">
    <div class="text-sm font-semibold mb-2">Loan amount</div>
    <input type="text" value="240,000" class="w-full border rounded px-2 py-1 text-lg" id="loanAmount">
  </div>

  <div class="mb-4">
    <div class="text-sm font-semibold mb-2">Loan term</div>
    <select class="w-full border rounded px-2 py-1 text-lg" id="loanTerm">
      <option>30-yr fixed</option>
      <option>30-yr fixed FHA</option>
      <option>30-yr fixed VA</option>
      <option>30-yr fixed USDA</option>
      <option>20-yr fixed</option>
      <option>15-yr fixed</option>
      <option>10 / 6 ARM</option>
      <option>7 / 6 ARM</option>
      <option>5 / 6 ARM</option>
      <option>3 / 6 ARM</option>
    </select>
  </div>

  <div class="flex justify-between mb-4">
    <div>
      <div class="text-sm font-semibold mb-2">Interest</div>
      <div class="text-lg">7.61 %</div>
    </div>
    <i class="fas fa-info-circle text-gray-400 cursor-pointer self-center"></i>
  </div>

  <div class="border-t pt-4">
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Home price</div>
      <input type="text" value="300,000" class="w-full border rounded px-2 py-1 text-lg" id="homePrice">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Down payment</div>
      <div class="flex">
        <input type="text" value="60,000" class="w-full border rounded-l px-2 py-1 text-lg" id="downPayment">
        <div class="bg-gray-200 rounded-r px-4 py-1 text-lg flex items-center">20 %</div>
      </div>
    </div>
  </div>

  <div class="border-t pt-4">
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">State</div>
      <select class="w-full border rounded px-2 py-1 text-lg" id="state">
        <option>New York</option>
      </select>
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Credit score</div>
      <select class="w-full border rounded px-2 py-1 text-lg" id="creditScore">
        <option>700 - 719</option>
      </select>
    </div>
  </div>

  <div class="border-t pt-4">
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Property tax (yearly)</div>
      <input type="text" value="3,750" class="w-full border rounded px-2 py-1 text-lg" id="propertyTax">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Home insurance (yearly)</div>
      <input type="text" value="1,050" class="w-full border rounded px-2 py-1 text-lg" id="homeInsurance">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Private mortgage insurance (monthly)</div>
      <input type="text" value="0" class="w-full border rounded px-2 py-1 text-lg" id="mortgageInsurance">
    </div>
    <div class="mb-4">
      <div class="text-sm font-semibold mb-2">Homeowners association (monthly)</div>
      <input type="text" value="0" class="w-full border rounded px-2 py-1 text-lg" id="hoaFees">
    </div>
  </div>

  <div class="flex justify-between pt-4">
    <div class="text-sm">
      <div class="font-semibold">Total monthly payment</div>
      <div class="text-3xl font-semibold">$<span id="totalPayment">2,036</span></div>
    </div>
    <div class="text-right">
      <div class="text-sm">Loan</div>
      <div class="text-lg">$<span id="loanPayment">1,635</span></div>
      <div class="text-sm">Taxes & fees</div>
      <div>$<span id="taxesPayment">401</span></div>
    </div>
  </div>

  <div class="text-xs text-gray-500 mt-4">
    <div>Disclaimer • Feedback</div>
  </div>
</div>

<script>
$(document).ready(function() {
  var loanAmount = 240000;
  var interestRate = 7.61;
  var loanTerm = 30;
  var homePrice = 300000;
  var downPayment = 60000;
  var propertyTax = 3750;
  var homeInsurance = 1050;
  var mortgageInsurance = 0;
  var hoaFees = 0;

  function updateCalculations() {
    var principal = loanAmount;
    var monthlyInterest = interestRate / 100 / 12;
    var numPayments = loanTerm * 12;
    var monthlyPayment = principal * monthlyInterest / (1 - (Math.pow(1/(1 + monthlyInterest), numPayments)));
    var totalPayment = monthlyPayment;
    var taxesPayment = (propertyTax + homeInsurance) / 12;

    if ($('#taxesToggle').is(':checked')) {
      totalPayment += taxesPayment + mortgageInsurance + hoaFees;
    }

    $('#monthlyPayment').text(Math.round(monthlyPayment).toLocaleString());
    $('#loanPayment').text(Math.round(monthlyPayment).toLocaleString());
    $('#taxesPayment').text(Math.round(taxesPayment + mortgageInsurance + hoaFees).toLocaleString());
    $('#totalPayment').text(Math.round(totalPayment).toLocaleString());
  }

  $('#taxesInfo').hover(function() {
    $('#taxesTooltip').removeClass('hidden');
  }, function() {
    $('#taxesTooltip').addClass('hidden');
  });

  $('#loanTerm').change(function() {
    loanTerm = parseInt($(this).val().split('-')[0]);
    updateCalculations();
  });

  $('#loanAmount').change(function() {
    loanAmount = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#homePrice').change(function() {
    homePrice = parseInt($(this).val().replace(/,/g, ''));
    loanAmount = homePrice - downPayment;
    $('#loanAmount').val(loanAmount.toLocaleString());
    updateCalculations();
  });

  $('#downPayment').change(function() {
    downPayment = parseInt($(this).val().replace(/,/g, ''));
    loanAmount = homePrice - downPayment;
    $('#loanAmount').val(loanAmount.toLocaleString());
    updateCalculations();
  });

  $('#propertyTax').change(function() {
    propertyTax = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#homeInsurance').change(function() {
    homeInsurance = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#mortgageInsurance').change(function() {
    mortgageInsurance = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  $('#hoaFees').change(function() {
    hoaFees = parseInt($(this).val().replace(/,/g, ''));
    updateCalculations();
  });

  updateCalculations();
});
</script>
</body>
</html>

"""

GOOGLE_FORM_VIDEO_PROMPT_MOCK = """

<thinking>User flow:
1. User starts on the Google search page and types in "times" in the search bar
2. As the user types, Google provides autocomplete suggestions related to "times"
3. User selects the "times" suggestion from the autocomplete dropdown
4. The search results page for "times" loads, showing various results related to The New York Times newspaper
5. User clicks the "Generate" button under "Get an AI-powered overview for this search?"
6. An AI-generated overview about The New York Times loads on the right side of the search results

Code structure:
- HTML structure with header, search bar, autocomplete dropdown, search button
- Search results area to display search results
- Sidebar area to display the AI-generated overview
- Use Tailwind CSS utility classes for styling
- Use jQuery to handle user interactions:
  - Typing in search bar to show/filter autocomplete suggestions
  - Selecting autocomplete suggestion to populate search bar
  - Clicking search button to display search results
  - Clicking "Generate" button to display AI overview
- Hardcode search results and AI overview content for demo purposes
</thinking>

<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"></link>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body>

<div class="flex flex-col h-screen">
  <div class="flex items-center gap-4 px-5 py-3">
    <img class="w-24" src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google logo">
    <div class="flex-grow relative">
      <input type="text" id="search" class="w-full px-4 py-2 text-lg border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search Google or type a URL">
      <div id="autocomplete" class="absolute w-full bg-white border border-gray-100 rounded-md shadow-lg z-10 hidden">
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">times</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">ts-ebml</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">tiktok ceo</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">two videos</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Taskrabbit</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">translate</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Target</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Taylor Swift</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Travis Kelce</div>
        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Temu</div>
      </div>
    </div>
    <button id="search-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md ml-2">
      <i class="fas fa-search"></i>
    </button>
    <img class="w-8 h-8 rounded-full ml-4" src="https://via.placeholder.com/150" alt="Profile picture of the user">
  </div>
  
  <div class="flex-grow overflow-y-auto">
    <div id="search-results" class="p-8 hidden">
      <div class="text-sm text-gray-600 mb-4">Results for New York, NY 10022 - Choose area</div>
      
      <div class="bg-blue-50 p-4 mb-4">
        <button id="overview-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">Get an AI-powered overview for this search?</button>
      </div>
      
      <div class="mb-4">
        <div class="text-xl text-blue-800 mb-1">
          <a href="https://www.nytimes.com">The New York Times</a>
        </div>
        <div class="text-sm text-gray-800 mb-1">https://www.nytimes.com</div>
        <div class="text-sm text-gray-600">
          The New York Times - Breaking News, US News, World News ...
        </div>
        <div class="text-sm text-gray-600">  
          Live news, investigations, opinion, photos and video by the journalists of The New York Times from more than 150 countries around the world.
        </div>
      </div>

      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-1">Opinion | The House Vote to Force TikTok's Sale Is a Mistake - The ...</div>
        <div class="text-sm text-gray-600">Why Are Lawmakers Trying to Ban TikTok Instead of Doing What ...</div>
      </div>

      <div class="mb-4">  
        <div class="text-sm text-gray-600 mb-1">The Crossword</div>
        <div class="text-sm text-gray-600">Play the Daily New York Times Crossword puzzle edited by Will ...</div>
      </div>

      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-1">Today's Paper</div>
        <div class="text-sm text-gray-600">Today's Paper · The Front Page · Highlights · Lawyer, Author ...</div>
      </div>

      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-1">Word game Wordle</div>
        <div class="text-sm text-gray-600">Get 6 chances to guess a 5-letter word.Get 6 chances to guess a ...</div>
      </div>

      <div>
        <div class="text-sm text-gray-600">Connections</div>
        <div class="text-sm text-gray-600">A look at the links between The Times and the world it covers.</div>
      </div>
    </div>
    
    <div id="overview" class="p-8 hidden">
      <h2 class="text-2xl font-bold mb-4">The New York Times</h2>
      <div class="mb-4">
        <div class="font-bold">Newspaper</div>
      </div>
      <div class="mb-4">  
        <div class="font-bold">Owner:</div>
        <div>The New York Times Company</div>
      </div>
      <div class="mb-4">
        <div class="font-bold">Publisher:</div>  
        <div>The New York Times Company</div>
      </div>
      <div class="mb-4">
        <div class="font-bold">Founders:</div>
        <div>George Jones, Henry Jarvis Raymond</div>  
      </div>
      <div class="mb-4">
        <div class="font-bold">Circulation:</div>
        <div>10,360,000 news subscribers (as of February 2024)</div>
      </div>
      <div class="mb-4">  
        <div class="font-bold">Editor-in-chief:</div>
        <div>Joseph Kahn</div>
      </div>
      <div class="mb-4">
        <div class="font-bold">Format:</div>
        <div>Broadsheet</div>
      </div>
      <div>  
        <div class="font-bold">Founded:</div> 
        <div>September 18, 1851; 172 years ago</div>
      </div>
    </div>
  </div>
</div>

<script>
$(document).ready(function() {
  let selectedText = "";
  
  $("#search").on("input", function() {
    const searchText = $(this).val().trim();
    
    if (searchText !== "") {
      $("#autocomplete").removeClass("hidden");
      $("#autocomplete div").each(function() {
        if ($(this).text().toLowerCase().startsWith(searchText.toLowerCase())) {
          $(this).removeClass("hidden");
        } else {
          $(this).addClass("hidden");
        }
      });
    } else {
      $("#autocomplete").addClass("hidden");
    }
  });
  
  $("#autocomplete div").click(function() {
    selectedText = $(this).text();
    $("#search").val(selectedText);
    $("#autocomplete").addClass("hidden");
  });
  
  $("#search-btn").click(function() {
    if (selectedText !== "") {
      $("#search-results").removeClass("hidden");
      $("#overview").addClass("hidden");
    }
  });
  
  $("#overview-btn").click(function() {
    $("#overview").removeClass("hidden");
  });
});
</script>

</body>
</html>

<thinking>
To improve the app further and make it fully functional like the original video:

1. Add more visual styling to match the original, including:
   - Google logo and favicon
   - User profile icon
   - Search bar styling and hover effects
   - Search button icon and styling
   - Fonts and text sizes
   - Spacing and layout adjustments

2. Implement the search functionality:
   - Perform a search when the user presses Enter or clicks the search button
   - Show a loading state while searching
   - Display the search results dynamically based on the query
   - Handle cases when no results are found

3. Enhance the autocomplete functionality:
   - Fetch autocomplete suggestions from a data source based on the user's input
   - Highlight the text match in the suggestions
   - Allow navigating the suggestions with arrow keys
   - Update the search input when a suggestion is selected

4. Improve the AI-powered overview:
   - Fetch the overview content dynamically based on the search query
   - Display a loading state while generating the overview
   - Enhance the styling of the overview to match the original

5. Add additional UI elements:
   - Header navigation tabs (About, Store, Gmail, Images)
   - Footer links (Advertising, Business, How Search works, Privacy, Terms)
   - Pagination for search results
   - Feedback link

6. Optimize performance:
   - Lazy-load images and content
   - Implement caching mechanisms
   - Minify and compress assets

7. Ensure responsiveness:
   - Make the layout responsive and mobile-friendly
   - Adjust font sizes, padding, and margins for different screen sizes
   - Hide/collapse certain elements on smaller screens

8. Enhance accessibility:
   - Add appropriate ARIA attributes
   - Ensure keyboard navigation works properly
   - Provide alternative text for images

9. Implement error handling:
   - Handle network errors gracefully
   - Display user-friendly error messages
   - Provide options to retry or refresh

10. Add smooth animations and transitions:
    - Fade in/out effects for loading states
    - Smooth sliding animations for autocomplete suggestions
    - Subtle hover and click animations for interactive elements
</thinking>

<html>
<head>
  <title>Google Search</title>
  <link rel="icon" href="https://www.google.com/favicon.ico" type="image/x-icon">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body class="font-roboto">

<div class="flex flex-col min-h-screen">
  <header class="flex items-center justify-end space-x-4 px-5 py-2 text-sm text-gray-700">
    <a href="#" class="hover:underline">About</a>
    <a href="#" class="hover:underline">Store</a>
    <a href="#" class="hover:underline">Gmail</a>
    <a href="#" class="hover:underline">Images</a>
    <img class="w-8 h-8 rounded-full" src="https://via.placeholder.com/150" alt="Profile picture of the user">
  </header>
  
  <div class="flex items-center justify-center flex-grow">
    <div class="flex flex-col items-center w-full max-w-[584px]">
      <img class="w-[272px] mb-8" src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Google logo">
      <div class="relative w-full mb-3">
        <input type="text" id="search" class="w-full px-5 py-3 text-lg border border-gray-200 rounded-full hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search Google or type a URL" autocomplete="off">
        <div id="autocomplete" class="absolute w-full bg-white border border-gray-100 rounded-md shadow-lg z-10 hidden">
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">times</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">ts-ebml</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">tiktok ceo</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">two videos</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Taskrabbit</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">translate</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Target</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Taylor Swift</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Travis Kelce</div>
          <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Temu</div>
        </div>
      </div>
      <div class="flex space-x-2">
        <button id="search-btn" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded">Google Search</button>
        <button class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded">I'm Feeling Lucky</button>
      </div>
    </div>
  </div>
  
  <div id="search-results" class="flex-grow p-8 overflow-y-auto hidden">
    <div class="text-sm text-gray-600 mb-4">Results for New York, NY 10022 - Choose area</div>
    
    <div class="bg-blue-50 p-4 mb-4">
      <button id="overview-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Get an AI-powered overview for this search</button>
    </div>
    
    <div id="results-list">
      <div class="mb-4">
        <div class="text-xl text-blue-800 mb-1">
          <a href="https://www.nytimes.com">The New York Times</a>
        </div>
        <div class="text-sm text-gray-800 mb-1">https://www.nytimes.com</div>
        <div class="text-sm text-gray-600">
          The New York Times - Breaking News, US News, World News ...
        </div>
        <div class="text-sm text-gray-600">  
          Live news, investigations, opinion, photos and video by the journalists of The New York Times from more than 150 countries around the world.
        </div>
      </div>

      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-1">Opinion | The House Vote to Force TikTok's Sale Is a Mistake - The ...</div>
        <div class="text-sm text-gray-600">Why Are Lawmakers Trying to Ban TikTok Instead of Doing What ...</div>
      </div>

      <div class="mb-4">  
        <div class="text-sm text-gray-600 mb-1">The Crossword</div>
        <div class="text-sm text-gray-600">Play the Daily New York Times Crossword puzzle edited by Will ...</div>
      </div>

      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-1">Today's Paper</div>
        <div class="text-sm text-gray-600">Today's Paper · The Front Page · Highlights · Lawyer, Author ...</div>
      </div>

      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-1">Word game Wordle</div>
        <div class="text-sm text-gray-600">Get 6 chances to guess a 5-letter word.Get 6 chances to guess a ...</div>
      </div>

      <div>
        <div class="text-sm text-gray-600">Connections</div>
        <div class="text-sm text-gray-600">A look at the links between The Times and the world it covers.</div>
      </div>
    </div>
    
    <div id="pagination" class="flex justify-center mt-8">
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2">Previous</button>
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Next</button>
    </div>
  </div>
  
  <div id="overview" class="flex-grow p-8 overflow-y-auto hidden">
    <h2 class="text-2xl font-medium mb-4">The New York Times</h2>
    <div class="mb-4">
      <div class="font-medium">Newspaper</div>
    </div>
    <div class="mb-4">  
      <div class="font-medium">Owner:</div>
      <div>The New York Times Company</div>
    </div>
    <div class="mb-4">
      <div class="font-medium">Publisher:</div>  
      <div>The New York Times Company</div>
    </div>
    <div class="mb-4">
      <div class="font-medium">Founders:</div>
      <div>George Jones, Henry Jarvis Raymond</div>  
    </div>
    <div class="mb-4">
      <div class="font-medium">Circulation:</div>
      <div>10,360,000 news subscribers (as of February 2024)</div>
    </div>
    <div class="mb-4">  
      <div class="font-medium">Editor-in-chief:</div>
      <div>Joseph Kahn</div>
    </div>
    <div class="mb-4">
      <div class="font-medium">Format:</div>
      <div>Broadsheet</div>
    </div>
    <div>  
      <div class="font-medium">Founded:</div> 
      <div>September 18, 1851; 172 years ago</div>
    </div>
  </div>
  
  <footer class="bg-gray-100 text-sm text-gray-600 px-8 py-3">
    <div class="flex justify-between">
      <div class="flex space-x-6">
        <a href="#" class="hover:underline">Advertising</a>
        <a href="#" class="hover:underline">Business</a>
        <a href="#" class="hover:underline">How Search works</a>
      </div>
      <div class="flex space-x-6">
        <a href="#" class="hover:underline">Privacy</a>
        <a href="#" class="hover:underline">Terms</a>
        <a href="#" class="hover:underline">Settings</a>
      </div>
    </div>
  </footer>
</div>

<script>
$(document).ready(function() {
  let selectedText = "";
  
  $("#search").on("input", function() {
    const searchText = $(this).val().trim();
    
    if (searchText !== "") {
      $("#autocomplete").removeClass("hidden");
      $("#autocomplete div").each(function() {
        if ($(this).text().toLowerCase().includes(searchText.toLowerCase())) {
          $(this).removeClass("hidden");
          $(this).html($(this).text().replace(new RegExp(searchText, "gi"), "<strong>$&</strong>"));
        } else {
          $(this).addClass("hidden");
        }
      });
    } else {
      $("#autocomplete").addClass("hidden");
    }
  });
  
  $("#autocomplete div").click(function() {
    selectedText = $(this).text();
    $("#search").val(selectedText);
    $("#autocomplete").addClass("hidden");
  });
  
  $("#search").keydown(function(e) {
    if (e.which === 13) {
      performSearch();
    }
  });
  
  $("#search-btn").click(performSearch);
  
  $("#overview-btn").click(function() {
    $("#overview").removeClass("hidden");
    $("#search-results").addClass("hidden");
  });
  
  function performSearch() {
    const query = $("#search").val().trim();
    if (query !== "") {
      $("#search-results").removeClass("hidden");
      $("#overview").addClass("hidden");
      
      // Simulating search results for demo purposes
      $("#results-list").empty();
      for (let i = 0; i < 6; i++) {
        $("#results-list").append(`
          <div class="mb-4">
            <div class="text-xl text-blue-800 mb-1">
              <a href="#">Search Result ${i + 1}</a>
            </div>
            <div class="text-sm text-gray-800 mb-1">https://example.com/result${i + 1}</div>
            <div class="text-sm text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nulla sit amet aliquam lacinia, nisl nisl aliquam nisl, nec aliquam nisl nisl sit amet nisl.
            </div>
          </div>
        `);
      }
    }
  }
});
</script>

</body>
</html>
"""

TALLY_FORM_VIDEO_PROMPT_MOCK = """
<thinking>
The user flow in the video seems to be:
1. The quiz starts by asking "What is the capital of Bulgaria?" with three multiple choice options. The user selects "Sofia".
2. The next question asks "What is the most famous dish in Belgium?" with two image-based options. The user selects "Steak with fries".
3. The next question asks "What is the name of this actor?" with an image of an older man with gray hair and beard. The user types in "Clooney" and submits the answer.
4. The quiz ends showing the user's score of 10/30 and a "Bummer, try again!" message with an arrow to restart.

To build this as a functional web app:
1. Create the overall page structure with a title, question area, answer options area, and next/submit buttons.
2. Use jQuery to show/hide different questions and update the answer options based on the current question. 
3. Store the questions, answer options, and correct answers in a Javascript array.
4. Keep track of the user's selections and compare them to the correct answers to calculate the score.
5. After the last question, show the final score and restart option.
6. Style everything to match the screenshots using Tailwind utility classes.
</thinking>

<html>
<!DOCTYPE html>
<html>
<head>
  <title>Online Trivia Quiz</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body class="bg-white text-gray-800 p-6">
  <h1 class="text-2xl font-bold mb-4">Online Trivia Quiz</h1>
  
  <div id="question-container" class="mb-6">
    <h2 id="question" class="text-xl mb-4"></h2>
    <div id="options" class="space-y-4"></div>
  </div>
  
  <div id="actor-container" class="mb-6 hidden">
    <img id="actor-image" src="" alt="" class="mb-4 w-2/3 mx-auto rounded-lg">
    <input type="text" id="actor-answer" class="border rounded w-full py-2 px-3 text-gray-700 mb-3">
  </div>

  <div id="result-container" class="text-center hidden">
    <h2 class="text-xl mb-2">Bummer, try again!</h2>
    <p id="score" class="text-lg mb-4"></p>
    <button id="restart-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      <i class="fas fa-redo mr-2"></i> Restart
    </button>
  </div>

  <button id="next-btn" class="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">
    Next <i class="fas fa-arrow-right ml-2"></i>
  </button>
  
  <button id="submit-btn" class="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded hidden">
    Submit <i class="fas fa-arrow-right ml-2"></i>
  </button>

  <script>
    const quizData = [
      {
        question: "What is the capital of Bulgaria?",
        options: ["Sofia", "Plovdiv", "Varna"],
        answer: "Sofia"
      },
      {
        question: "What is the most famous dish in Belgium?", 
        options: [
          {
            image: "https://via.placeholder.com/300x200?text=Spaghetti",
            alt: "A bowl of spaghetti pasta with tomato sauce and parmesan cheese on top",
            text: "Spaghetti"
          },
          {
            image: "https://via.placeholder.com/300x200?text=Steak+with+fries",
            alt: "A plate with grilled steak, french fries, and greens",
            text: "Steak with fries"
          }
        ],
        answer: "Steak with fries"
      },
      {
        question: "What is the name of this actor?",
        image: "https://via.placeholder.com/400x300?text=Older+man+with+gray+hair+and+beard",
        alt: "Headshot of an older man with gray hair and a gray beard wearing a black suit and bowtie",
        answer: "Clooney"
      }
    ];

    let currentQuestion = 0;
    let score = 0;

    function startQuiz() {
      currentQuestion = 0;
      score = 0;
      $("#question-container").show();
      $("#actor-container").hide();
      $("#result-container").hide();
      $("#next-btn").show();
      $("#submit-btn").hide();
      showQuestion();
    }

    function showQuestion() {
      const questionData = quizData[currentQuestion];
      $("#question").text(questionData.question);
      
      if (questionData.options) {
        let optionsHtml = "";
        for (let option of questionData.options) {
          if (typeof option === "string") {
            optionsHtml += `
              <div>
                <label>
                  <input type="radio" name="answer" value="${option}">
                  ${option}
                </label>
              </div>
            `;
          } else {
            optionsHtml += `
              <div>
                <label>
                  <input type="radio" name="answer" value="${option.text}">
                  <img src="${option.image}" alt="${option.alt}" class="w-full mb-2">
                  ${option.text}
                </label>
              </div>
            `;
          }
        }
        $("#options").html(optionsHtml);
        $("#actor-container").hide();
      } else {
        $("#options").empty();
        $("#actor-image").attr("src", questionData.image).attr("alt", questionData.alt);
        $("#actor-answer").val("");
        $("#actor-container").show();
        $("#next-btn").hide();
        $("#submit-btn").show();
      }
    }

    function checkAnswer() {
      const questionData = quizData[currentQuestion];
      
      let userAnswer;
      if (questionData.options) {
        userAnswer = $("input[name='answer']:checked").val();
      } else {
        userAnswer = $("#actor-answer").val().trim();
      }

      if (userAnswer === questionData.answer) {
        score++;
      }

      currentQuestion++;
      
      if (currentQuestion < quizData.length) {
        showQuestion();
      } else {
        showResult();
      }
    }

    function showResult() {
      $("#question-container").hide();
      $("#actor-container").hide();
      $("#score").text(`Your score is: ${score} / ${quizData.length}`);
      $("#result-container").show();
    }

    $("#next-btn").click(checkAnswer);
    $("#submit-btn").click(checkAnswer);
    $("#restart-btn").click(startQuiz);

    startQuiz();
  </script>
</body>
</html>
</html>

This implements the online trivia quiz app as shown in the video. It uses jQuery to handle the interactions and Tailwind CSS for styling. The questions, options, and answers are defined in the quizData array. The app keeps track of the user's current question and score, allows selecting or entering answers, and displays the final score at the end with the option to restart.

<thinking>
To further improve the app to match the original video:

1. Adjust the styling to more closely match the font, colors, spacing, and layout in the screenshots. 
2. Add a cursor pointer when hovering over answer options.
3. Improve the styling of the selected answer option.
4. Make the "Next" button change to an arrow icon on hover.
5. Add a "Back" button to go to the previous question.
6. Show the current question number and total (e.g. "Question 1 of 3").
7. Animate the transitions between questions.
8. Improve the responsive layout for different screen sizes.
9. Preload the images to avoid flickering.
10. Refactor the code to be more modular and maintainable.
</thinking>

<html>
<!DOCTYPE html>
<html>
<head>
  <title>Online Trivia Quiz</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
    body {
      font-family: 'Roboto', sans-serif;
    }
    .option {
      cursor: pointer;
    }
    .option.selected {
      background-color: #EFF6FF;
      border-color: #2563EB;
    }
    #next-btn:hover i {
      transform: translateX(5px);
    }
  </style>
</head>
<body class="bg-white text-gray-800 p-6">
  <h1 class="text-3xl font-bold mb-8 text-center">Online Trivia Quiz</h1>
  
  <div class="max-w-xl mx-auto">
    <div id="question-container" class="mb-8">
      <div class="flex justify-between mb-4">
        <button id="back-btn" class="text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded">
          <i class="fas fa-arrow-left mr-2"></i> Back
        </button>
        <span id="question-number" class="text-lg font-medium"></span>
      </div>
      <h2 id="question" class="text-2xl font-medium mb-6"></h2>
      <div id="options" class="space-y-4"></div>
    </div>
    
    <div id="actor-container" class="mb-8 hidden">
      <img id="actor-image" src="" alt="" class="mb-6 mx-auto rounded-lg">
      <input type="text" id="actor-answer" class="border border-gray-400 rounded w-full py-2 px-4 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600">
    </div>

    <div id="result-container" class="text-center hidden">
      <h2 class="text-2xl font-medium mb-2">Bummer, try again!</h2>
      <p id="score" class="text-xl mb-6"></p>
      <button id="restart-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
        <i class="fas fa-redo mr-2"></i> Restart
      </button>
    </div>

    <button id="next-btn" class="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded flex items-center ml-auto">
      Next <i class="fas fa-arrow-right ml-2"></i>
    </button>
    
    <button id="submit-btn" class="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded flex items-center ml-auto hidden">
      Submit <i class="fas fa-arrow-right ml-2"></i>
    </button>
  </div>

  <script>
    const quizData = [
      {
        question: "What is the capital of Bulgaria?",
        options: ["Sofia", "Plovdiv", "Varna"],
        answer: "Sofia"
      },
      {
        question: "What is the most famous dish in Belgium?", 
        options: [
          {
            image: "https://sdxl-trainings.s3.amazonaws.com/DALL%C2%B7E+2024-03-08+12.29.30+-+A+bowl+of+spaghetti+pasta+with+tomato+sauce+and+parmesan+cheese+on+top%2C+set+on+a+rustic+wooden+table.+The+light+is+soft+and+warm%2C+enhancing+the+vibran.webp",
            alt: "A bowl of spaghetti pasta with tomato sauce and parmesan cheese on top",
            text: "Spaghetti"
          },
          {
            image: "https://sdxl-trainings.s3.amazonaws.com/DALL%C2%B7E+2024-03-08+12.33.19+-+A+plate+with+grilled+steak%2C+french+fries%2C+and+greens%2C+presented+elegantly.+The+steak+is+perfectly+cooked+to+medium+rare%2C+showing+a+rich%2C+pink+center+a.webp",
            alt: "A plate with grilled steak, french fries, and greens",
            text: "Steak with fries"
          }
        ],
        answer: "Steak with fries"
      },
      {
        question: "What is the name of this actor?",
        image: "https://sdxl-trainings.s3.amazonaws.com/DALL%C2%B7E+2024-03-08+12.34.00+-+Headshot+of+an+older+man+with+distinguished+gray+hair+and+a+neatly+trimmed+gray+beard%2C+conveying+a+sense+of+wisdom+and+experience.+He+is+wearing+a+cri.webp",
        alt: "Headshot of an older man with gray hair and a gray beard wearing a black suit and bowtie",
        answer: "Clooney"
      }
    ];

    let currentQuestion = 0;
    let score = 0;

    function startQuiz() {
      currentQuestion = 0;
      score = 0;
      $("#question-container").show();
      $("#actor-container").hide();
      $("#result-container").hide();
      $("#next-btn").show();
      $("#submit-btn").hide();
      showQuestion();
    }

    function showQuestion() {
      const questionData = quizData[currentQuestion];
      $("#question").text(questionData.question);
      $("#question-number").text(`Question ${currentQuestion + 1} of ${quizData.length}`);
      
      if (questionData.options) {
        let optionsHtml = "";
        for (let option of questionData.options) {
          if (typeof option === "string") {
            optionsHtml += `
              <div class="option p-4 border border-gray-300 rounded flex items-center">
                <input type="radio" name="answer" id="${option}" value="${option}" class="mr-4">
                <label for="${option}" class="text-lg font-medium flex-grow cursor-pointer">${option}</label>
              </div>
            `;
          } else {
            optionsHtml += `
              <div class="option p-4 border border-gray-300 rounded flex items-center">
                <input type="radio" name="answer" id="${option.text}" value="${option.text}" class="mr-4">
                <label for="${option.text}" class="flex-grow cursor-pointer">
                  <img src="${option.image}" alt="${option.alt}" class="w-full mb-2 rounded">
                  <span class="text-lg font-medium">${option.text}</span>
                </label>
              </div>
            `;
          }
        }
        $("#options").html(optionsHtml);
        $("#actor-container").hide();
      } else {
        $("#options").empty();
        $("#actor-image").attr("src", questionData.image).attr("alt", questionData.alt);
        $("#actor-answer").val("");
        $("#actor-container").show();
        $("#next-btn").hide();
        $("#submit-btn").show();
      }
      
      $("#back-btn").toggle(currentQuestion > 0);
    }

    function checkAnswer() {
      const questionData = quizData[currentQuestion];
      
      let userAnswer;
      if (questionData.options) {
        userAnswer = $("input[name='answer']:checked").val();
      } else {
        userAnswer = $("#actor-answer").val().trim();
      }

      if (userAnswer === questionData.answer) {
        score++;
      }

      currentQuestion++;
      
      if (currentQuestion < quizData.length) {
        $("#question-container").fadeOut(200, function() {
          showQuestion();
          $(this).fadeIn(200);
        });
      } else {
        $("#question-container").fadeOut(200, function() {
          showResult();
          $("#result-container").fadeIn(200);
        });
      }
    }

    function previousQuestion() {
      if (currentQuestion > 0) {
        currentQuestion--;
        $("#question-container").fadeOut(200, function() {
          showQuestion();
          $(this).fadeIn(200);
        });
      }
    }

    function showResult() {
      $("#score").text(`Your score is: ${score} / ${quizData.length}`);
    }

    $("#next-btn").click(checkAnswer);
    $("#submit-btn").click(checkAnswer);
    $("#back-btn").click(previousQuestion);
    $("#restart-btn").click(function() {
      $("#result-container").fadeOut(200, function() {
        startQuiz();
        $("#question-container").fadeIn(200);
      });
    });

    $("body").on("change", "input[name='answer']", function() {
      $(".option").removeClass("selected");
      $(this).closest(".option").addClass("selected");
    });

    $(document).ready(function() {
      // Preload images
      let images = [];
      for (let question of quizData) {
        if (question.image) {
          images.push(question.image);
        } else if (question.options) {
          for (let option of question.options) {
            if (option.image) {
              images.push(option.image);
            }
          }
        }
      }
      preloadImages(images, startQuiz);
    });

    function preloadImages(urls, callback) {
      let count = 0;
      for (let url of urls) {
        $("<img>").attr("src", url).on("load", function() {
          count++;
          if (count === urls.length) {
            callback();
          }
        });
      }
    }
  </script>
</body>
</html>
</html>

This updated version makes several improvements to match the original app more closely:

1. Styling is refined to better match the font, colors, spacing, and layout of the screenshots.
2. Cursor changes to a pointer when hovering over answer options.
3. Selected answer option is highlighted.
4. "Next" button shows an animated arrow on hover.
5. "Back" button added to go to the previous question.
6. Current question number and total are displayed.
7. Fade transitions are added between questions.
8. Layout is made responsive for different screen sizes.
9. Images are preloaded to avoid flickering.
10. Code is refactored to be more modular and maintainable.

The app should now be fully functional and closely resemble the look and behavior of the original video. Let me know if you would like any further adjustments!
"""
