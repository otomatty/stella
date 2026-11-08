public class Q10DivisibleByTests
{
    [Fact(DisplayName = "Q10 割り切れるか")]
    public void Q10DivisibleBy()
    {
        Assert.Equal(true, Answers.Q10DivisibleBy(9, 3));
        Assert.Equal(false, Answers.Q10DivisibleBy(10, 3));
    }
}
