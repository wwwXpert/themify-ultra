<?php
/**
 * Custom functions specific to the skin
 *
 * @package Themify Ultra
 */

/**
 * Load Google web fonts required for the skin
 *
 * @since 1.4.9
 * @return array
 */
function themify_theme_ristorante_google_fonts( $fonts ) {
	$fonts = array();
	/* translators: If there are characters in your language that are not supported by this font, translate this to 'off'. Do not translate into your own language. */
	if ( 'off' !== _x( 'on', 'Lato font: on or off', 'themify' ) ) {
		$fonts['lato'] = 'family=Lato:300,400,700,900&display=swap';
	}
	return $fonts;
}
add_filter( 'themify_google_fonts', 'themify_theme_ristorante_google_fonts' );