jQuery(function($){

	'use strict';

	$( 'a' ).each(function(el){
		$( this ).attr( 'href', Themify.UpdateQueryString( 'tp', '1', $( this ).attr( 'href' ) ) );
	});

	$( 'body' ).on( 'click', '.hook-location-hint', function() {
		let target = window.top.tf_hook_target,
			value = this.getAttribute( 'data-id' );
		target.value = value;

		window.top.jQuery.magnificPopup.close();
	} );

});