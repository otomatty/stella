public class CheckCDiscountTests
{
    [Theory(DisplayName = "確認C")]
    [InlineData(2500, 2200)]
    [InlineData(1999, 1999)]
    [InlineData(2000, 1700)]
    [InlineData(0, 0)]
    [InlineData(10000, 9700)]
    public void CheckCDiscount(int price, int expected)
    {
        Assert.Equal(expected, Answers.CheckCDiscount(price));
    }
}
