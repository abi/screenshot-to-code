import asyncio
from typing import Awaitable, Callable

from custom_types import InputMode


STREAM_CHUNK_SIZE = 100


async def mock_completion(
    process_chunk: Callable[[str], Awaitable[None]], input_mode: InputMode
) -> str:
    code_to_return = (
        MORTGAGE_CALCULATOR_VIDEO_PROMPT_MOCK
        if input_mode == "video"
        else NO_IMAGES_NYTIMES_MOCK_CODE
    )

    for i in range(0, len(code_to_return), STREAM_CHUNK_SIZE):
        await process_chunk(code_to_return[i : i + STREAM_CHUNK_SIZE])
        await asyncio.sleep(0.01)

    return code_to_return


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
                            <h2 class="text-xl font-bold mb-2">Israeli Military Raids Gaza’s Largest Hospital</h2>
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
                            <h2 class="text-xl font-bold mb-2">Israeli Military Raids Gaza’s Largest Hospital</h2>
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
"""
