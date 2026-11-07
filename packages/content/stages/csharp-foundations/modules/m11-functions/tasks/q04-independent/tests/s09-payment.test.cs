public class S09PaymentTests
{
    [Fact(DisplayName = "S09 支払総額")]
    public void S09Payment()
    {
        Assert.Equal(3000, Answers.S09Payment(new int[] { 1000, 1000, 1000 }));
        Assert.Equal(2200, Answers.S09Payment(new int[] { 800, 900 }));
        Assert.Equal(3000, Answers.S09Payment(new int[] { 3000 }));
        Assert.Equal(3499, Answers.S09Payment(new int[] { 2999 }));
        Assert.Equal(500, Answers.S09Payment(new int[] { }));
    }
}
