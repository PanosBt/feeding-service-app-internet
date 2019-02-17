$(function () {
    // clear all input fields on load
    $('input[type=email], input[type=tel], textarea').val('');

    $('#updateStudentDataForm').submit(function (event) {
        // Prevent form from submitting normally
        event.preventDefault();

        let $form = $(this);

        if ($('#email').val() === '' && $('#phone').val() === '')
            alert('Δεν συμπληρώσατε στοιχεία επικοινωνίας');

        else {
            let url = $form.attr('action');

            $.post(url, $form.serialize(), function (data) {
                console.log(data);
                alert('Τα στοιχεία σας ενημερώθηκαν επιτυχώς');
                location.reload();
            })
                .fail(function () {
                    alert('Η ενημέρωση των στοιχείων σας απέτυχε');
                    // $('#commData').append('<p class="error-color error"></p>');
                });
        }
    });
});