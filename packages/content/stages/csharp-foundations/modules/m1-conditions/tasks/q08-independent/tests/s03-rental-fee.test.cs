public class S03RentalFeeTests
{
    [Theory(DisplayName = "S03 貸出時間")]
    [InlineData(0, 0)]
    [InlineData(15, 100)]
    [InlineData(16, 200)]
    [InlineData(1, 100)]
    [InlineData(30, 200)]
    [InlineData(120, 800)]
    public void S03RentalFee(int m, int expected)
    {
        Assert.Equal(expected, Answers.S03RentalFee(m));
    }
}
