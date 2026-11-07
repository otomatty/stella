public class Q10DivisibleTests
{
    [Theory(DisplayName = "Q10 割り切れるか")]
    [InlineData(9, 3, "Yes")]
    [InlineData(10, 3, "No")]
    [InlineData(0, 5, "Yes")]
    public void Q10Divisible(int a, int b, string expected)
    {
        Assert.Equal(expected, Answers.Q10Divisible(a, b));
    }
}
