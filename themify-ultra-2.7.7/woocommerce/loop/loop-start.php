<?php
/**
 * Product Loop Start
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/loop/loop-start.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see 	    https://docs.woocommerce.com/document/template-structure/
 * @package 	WooCommerce/Templates
 * @version     3.3.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $themify;
?>
<ul class="products <?php echo ( ( $themify->query_category != '' || is_archive() || ! empty( $themify->load_from_products_module ) ) && ! wc_get_loop_prop( 'is_shortcode' ) ) ? esc_attr( themify_theme_query_classes() ) : 'columns-' . esc_attr( wc_get_loop_prop( 'columns' ) ); ?>">
