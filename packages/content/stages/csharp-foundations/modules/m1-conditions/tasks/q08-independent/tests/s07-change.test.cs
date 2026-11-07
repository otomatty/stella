public class S07ChangeTests
{
    [Theory(DisplayName = "S07 おつり")]
    [InlineData(700, 1000, 300)]
    [InlineData(700, 699, -1)]
    [InlineData(700, 700, 0)]
    [InlineData(0, 0, 0)]
    [InlineData(10000, 0, -1)]
    public void S07Change(int price, int paid, int expected)
    {
        Assert.Equal(expected, Answers.S07Change(price, paid));
    }
}
