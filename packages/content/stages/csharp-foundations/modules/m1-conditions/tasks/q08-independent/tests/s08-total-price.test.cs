public class S08TotalPriceTests
{
    [Theory(DisplayName = "S08 追加料金")]
    [InlineData(3, 300)]
    [InlineData(4, 380)]
    [InlineData(0, 0)]
    [InlineData(1, 100)]
    [InlineData(5, 460)]
    [InlineData(30, 2460)]
    public void S08TotalPrice(int n, int expected)
    {
        Assert.Equal(expected, Answers.S08TotalPrice(n));
    }
}
