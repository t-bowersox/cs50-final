/**
 * Initiate custom form validation for use with Bootstrap form validation.
 */
export function initCustomFormValidation() {
    /** @type NodeListOf<HTMLFormElement> */
    const formsToValidate = document.querySelectorAll('form[novalidate]');

    formsToValidate.forEach((form) => {
        initConfirmationInputs(form);

        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        });
    });
}

/**
 * Initiate validation for inputs with a `data-confirmation` attribute.
 * @param {HTMLFormElement} form 
 */
function initConfirmationInputs(form) {
    /** @type NodeListOf<HTMLInputElement> */
    const confirmationRequired = form.querySelectorAll('input[data-confirmation]');

    confirmationRequired.forEach((input) => {
        /** @type HTMLInputElement */
        const confirmWith = form.querySelector(`#${input.dataset.confirmation}`);

        if (confirmWith) {
            input.addEventListener('change', () => {
                input.setCustomValidity(confirmWith.value !== input.value ? 'Values do not match.' : '');
                input.reportValidity();
            });
        }
    });
}

